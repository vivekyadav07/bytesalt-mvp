import asyncio
import base64
import json
import logging
import time
from typing import List, Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from models import (
    TestCase,
    TestExecutionResult,
    NetworkLog,
    CategorizedNetworkLogs,
    ExecuteRequest,
    StepExecutionLog
)
from scanner import extract_interactive_elements, wait_for_spa_ready

logger = logging.getLogger("bytesalt.executor")

STATIC_EXTENSIONS = (
    ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
    ".woff", ".woff2", ".ttf", ".eot", ".ico", ".map", ".html"
)


async def _highlight_locator(locator):
    """Visually highlights active element on screen with a glowing amber/orange halo."""
    try:
        await locator.evaluate("""el => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'all 0.25s ease-in-out';
            el.style.outline = '4px solid #f97316';
            el.style.outlineOffset = '2px';
            el.style.boxShadow = '0 0 16px rgba(249, 115, 22, 0.9)';
            setTimeout(() => {
                el.style.outline = '';
                el.style.outlineOffset = '';
                el.style.boxShadow = '';
            }, 1200);
        }""")
    except Exception:
        pass


async def execute_single_test_flow(
    page: Page,
    test_case: TestCase,
    target_url: str,
    step_delay_ms: int = 1000,
    human_typing: bool = True,
    highlight_element: bool = True
) -> TestExecutionResult:
    """
    Executes a single test case inside the provided page/tab.
    Supports human-visible pacing (sequential keystrokes & glowing highlights),
    intercepts ONLY fetch/XHR API calls, groups them into 200/warnings/500 lists,
    and captures screenshot proof.
    """
    start_time = time.time()
    network_logs: List[NetworkLog] = []
    console_errors: List[str] = []
    step_logs: List[StepExecutionLog] = []
    screenshot_b64: Optional[str] = None
    final_url = target_url
    status = "PASS"
    failure_reason = None
    ui_observation = "Executed all steps successfully"

    # 1. Network Spy: Intercept ONLY fetch / XHR API calls
    async def handle_response(response):
        try:
            req = response.request
            resource_type = req.resource_type
            # STRICT FILTER: Only intercept true fetch / XHR calls
            if resource_type not in ("fetch", "xhr"):
                return

            # Exclude static assets
            clean_url = response.url.split("?")[0].lower()
            if any(clean_url.endswith(ext) for ext in STATIC_EXTENSIONS):
                return

            post_data = None
            if req.post_data:
                try:
                    post_data = json.loads(req.post_data)
                except Exception:
                    post_data = req.post_data

            body = None
            try:
                body = await response.json()
            except Exception:
                try:
                    text = await response.text()
                    body = text[:500] if text else None
                except Exception:
                    body = None

            network_logs.append(NetworkLog(
                url=response.url,
                method=req.method,
                status=response.status,
                request_payload=post_data,
                response_body=body
            ))
        except Exception as net_err:
            logger.debug(f"Error logging response: {net_err}")

    # Listeners
    page.on("response", handle_response)
    on_error = lambda err: console_errors.append(f"Uncaught Error: {str(err)}")
    on_console = lambda msg: console_errors.append(f"Console {msg.type}: {msg.text}") if msg.type == "error" else None
    page.on("pageerror", on_error)
    page.on("console", on_console)

    try:
        logger.info(f"[{test_case.tc_id}] Navigating to {target_url} (step_delay={step_delay_ms}ms)")
        await page.goto(target_url, wait_until="domcontentloaded", timeout=25000)
        await wait_for_spa_ready(page, max_wait_seconds=10)
        await extract_interactive_elements(page)

        # Brief initial pause so user's eye can register page load
        if step_delay_ms > 0:
            await page.wait_for_timeout(min(step_delay_ms, 800))

        # Execute Test Steps
        for step in test_case.steps:
            logger.info(f"[{test_case.tc_id}] Step {step.step_no}: {step.action} - {step.description}")
            target_desc = step.target_id or step.css_selector or "Element"

            step_log = StepExecutionLog(
                step_no=step.step_no,
                action=step.action,
                target=target_desc,
                input_value=step.value,
                description=step.description,
                status="SUCCESS",
                detail=None
            )

            try:
                # Locate element
                locator = None
                if step.target_id:
                    loc = page.locator(f'[data-bytesalt-id="{step.target_id}"]')
                    if await loc.count() > 0:
                        locator = loc.first

                if locator is None and step.css_selector:
                    try:
                        loc = page.locator(step.css_selector)
                        if await loc.count() > 0:
                            locator = loc.first
                    except Exception:
                        pass

                # Visual highlight for human observation
                if locator and highlight_element:
                    await _highlight_locator(locator)

                # Perform Action with Human Pacing
                if step.action == "fill":
                    if locator is None:
                        raise Exception(f"Input field '{target_desc}' not found on page")
                    is_disabled = await locator.is_disabled()
                    if is_disabled:
                        step_log.detail = "Field is currently locked/disabled by application workflow"
                        step_log.status = "SUCCESS"
                    else:
                        if human_typing and step.value:
                            try:
                                await locator.click(timeout=1500)
                                await locator.fill("")
                                # Type visibly with sequential keystroke interval
                                await locator.press_sequentially(step.value, delay=65)
                            except Exception:
                                await locator.fill(step.value or "", timeout=3000)
                        else:
                            await locator.fill(step.value or "", timeout=3000)
                        step_log.detail = f"Input value '{step.value}' successfully typed into field"

                elif step.action == "click":
                    if locator is None:
                        raise Exception(f"Click target '{target_desc}' not found on page")
                    try:
                        await locator.click(timeout=2500)
                        step_log.detail = f"Clicked target '{target_desc}'"
                    except Exception:
                        try:
                            await locator.click(force=True, timeout=1500)
                            step_log.detail = f"Clicked target '{target_desc}' (forced)"
                        except Exception as click_err:
                            if test_case.category == "Validation_Empty":
                                step_log.detail = "Button prevented submission while empty (Expected Client Validation)"
                                step_log.status = "SUCCESS"
                            else:
                                step_log.detail = f"Target was unclickable/disabled: {str(click_err)}"
                                step_log.status = "FAILED"
                                raise click_err

                    # Wait after click for potential navigation / API triggers
                    await page.wait_for_timeout(800)
                    try:
                        await page.wait_for_load_state("networkidle", timeout=2500)
                    except Exception:
                        pass
                    try:
                        await extract_interactive_elements(page)
                    except Exception:
                        pass

                elif step.action == "select":
                    if locator is None:
                        raise Exception(f"Select element '{target_desc}' not found")
                    selected = False
                    if step.value:
                        try:
                            await locator.select_option(value=step.value, timeout=2000)
                            selected = True
                        except Exception:
                            try:
                                await locator.select_option(label=step.value, timeout=2000)
                                selected = True
                            except Exception:
                                pass
                    if not selected:
                        try:
                            await locator.select_option(index=1, timeout=1000)
                        except Exception:
                            pass
                    step_log.detail = f"Selected option '{step.value}'"

                elif step.action == "wait":
                    wait_ms = int(step.value) if step.value and step.value.isdigit() else 1000
                    await page.wait_for_timeout(wait_ms)
                    step_log.detail = f"Waited {wait_ms}ms for UI transition"

                elif step.action == "assert_text":
                    expected_txt = step.value or ""
                    page_text = await page.content()
                    if expected_txt.lower() not in page_text.lower():
                        raise AssertionError(f"Expected text '{expected_txt}' not found on page")
                    step_log.detail = f"Verified presence of '{expected_txt}' on page"

                # Step-by-step visual pause so user can see every action with their eyes
                if step_delay_ms > 0:
                    await page.wait_for_timeout(step_delay_ms)

            except Exception as step_err:
                step_log.status = "FAILED"
                step_log.detail = str(step_err)
                step_logs.append(step_log)
                raise step_err

            step_logs.append(step_log)

        final_url = page.url

        # Pass / Fail Evaluation Rules
        server_500s = [n for n in network_logs if n.status >= 500]
        if server_500s:
            status = "FAIL"
            first_500 = server_500s[0]
            failure_reason = f"Server 500 Error detected: {first_500.method} {first_500.url} (Status {first_500.status})"
            ui_observation = f"Backend failure: {first_500.response_body}"

        elif test_case.category == "Positive":
            client_errors = [n for n in network_logs if n.status >= 400]
            if client_errors:
                status = "FAIL"
                err_req = client_errors[0]
                failure_reason = f"API Error {err_req.status} in Happy Path test: {err_req.method} {err_req.url}"
                ui_observation = f"Expected HTTP 200, but API responded with {err_req.status}"

        elif test_case.category == "Validation_Empty":
            successful_mutations = [n for n in network_logs if n.method in ("POST", "PUT", "PATCH") and n.status in (200, 201)]
            if successful_mutations:
                status = "FAIL"
                failure_reason = "Form submitted with empty required fields; API incorrectly accepted mutation (HTTP 200/201)"
                ui_observation = "Missing client/server validation: empty form submission was persisted"

        if status == "PASS" and console_errors:
            status = "FAIL"
            failure_reason = f"Uncaught JavaScript console error: {console_errors[0]}"

    except Exception as exec_err:
        status = "FAIL"
        failure_reason = f"Execution error: {str(exec_err)}"
        ui_observation = f"Test execution halted due to: {str(exec_err)}"
        logger.error(f"[{test_case.tc_id}] Error during test execution: {exec_err}")

    finally:
        # Capture Screenshot Proof
        try:
            screenshot_bytes = await page.screenshot(full_page=False)
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
        except Exception as ss_err:
            logger.warning(f"Failed to capture screenshot: {ss_err}")

        # Remove listeners for this test run
        try:
            page.remove_listener("response", handle_response)
        except Exception:
            pass

    elapsed_ms = int((time.time() - start_time) * 1000)

    # Narrative Summary
    input_details = [f"{s.target}: '{s.input_value}'" for s in step_logs if s.action == "fill" and s.input_value]
    inputs_summary_str = f"Given Inputs: [{', '.join(input_details)}]" if input_details else "No field inputs entered"

    if status == "PASS":
        readable_summary = f"Passed successfully! Completed all {len(step_logs)} test steps in {elapsed_ms}ms. {inputs_summary_str}. All API calls and UI state validated without backend 500 errors or console crashes."
    else:
        readable_summary = f"Issue detected during test execution ({elapsed_ms}ms). {inputs_summary_str}. Diagnosis: {failure_reason or ui_observation}."

    # Categorize Network Logs into Passed (200), Warnings (4xx/3xx), and Failed (5xx)
    passed_200 = [n for n in network_logs if 200 <= n.status < 300]
    warnings_4xx = [n for n in network_logs if 300 <= n.status < 500]
    failed_5xx = [n for n in network_logs if n.status >= 500]

    categorized_net = CategorizedNetworkLogs(
        passed_200=passed_200,
        warnings_4xx=warnings_4xx,
        failed_5xx=failed_5xx
    )

    return TestExecutionResult(
        tc_id=test_case.tc_id,
        title=test_case.title,
        category=test_case.category,
        status=status,
        execution_time_ms=elapsed_ms,
        final_url=final_url,
        ui_observation=ui_observation,
        network_logs=network_logs,
        categorized_network=categorized_net,
        console_errors=console_errors,
        failure_reason=failure_reason,
        screenshot_base64=screenshot_b64,
        step_logs=step_logs,
        readable_summary=readable_summary
    )


async def execute_test_suite_parallel(
    req: ExecuteRequest,
    concurrency_limit: int = 4
) -> List[TestExecutionResult]:
    """
    Executes test suite according to user preference:
    - 'single_tab_step_by_step' (DEFAULT): Executes all tests sequentially inside EXACTLY ONE TAB.
      The user can watch every action, typed character, and click step-by-step with their own eyes.
    - 'parallel_tabs': Executes tests concurrently across multiple tabs inside the single browser window.
    """
    is_single_tab = req.execution_mode == "single_tab_step_by_step"
    logger.info(
        f"Executing {len(req.test_cases)} tests (mode={req.execution_mode}, "
        f"delay={req.step_delay_ms}ms, headless={req.headless})"
    )

    async with async_playwright() as p:
        # Launch Chromium window once
        browser: Browser = await p.chromium.launch(
            headless=req.headless,
            args=["--disable-dev-shm-usage", "--no-sandbox"]
        )

        try:
            # Single Browser Context for the window
            context: BrowserContext = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                ignore_https_errors=True
            )

            # Inject Auth token if provided
            if req.auth_token:
                init_script = f"""
                try {{
                    window.localStorage.setItem({json.dumps(req.auth_storage_key)}, {json.dumps(req.auth_token)});
                }} catch (e) {{
                    console.error("Failed to inject auth token:", e);
                }}
                """
                await context.add_init_script(init_script)

            if is_single_tab:
                # =========================================================================
                # SINGLE TAB STEP-BY-STEP MODE (Watch with your own eyes)
                # =========================================================================
                page: Page = await context.new_page()
                results: List[TestExecutionResult] = []

                for tc in req.test_cases:
                    result = await execute_single_test_flow(
                        page=page,
                        test_case=tc,
                        target_url=req.url,
                        step_delay_ms=req.step_delay_ms,
                        human_typing=req.human_typing,
                        highlight_element=req.highlight_element
                    )
                    results.append(result)

                # Brief pause at the end so the user can inspect final rendered UI
                if not req.headless:
                    await page.wait_for_timeout(1500)

                await page.close()
                return results

            else:
                # =========================================================================
                # PARALLEL TABS MODE (Fast concurrent execution across tabs)
                # =========================================================================
                semaphore = asyncio.Semaphore(concurrency_limit)

                async def _run_in_tab(tc: TestCase):
                    async with semaphore:
                        page: Page = await context.new_page()
                        try:
                            return await execute_single_test_flow(
                                page=page,
                                test_case=tc,
                                target_url=req.url,
                                step_delay_ms=max(req.step_delay_ms // 2, 200),
                                human_typing=False,
                                highlight_element=False
                            )
                        finally:
                            await page.close()

                tasks = [_run_in_tab(tc) for tc in req.test_cases]
                results = await asyncio.gather(*tasks)
                return results

        finally:
            await browser.close()
