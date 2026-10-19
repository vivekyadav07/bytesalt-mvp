import json
import logging
import time
from typing import Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import async_playwright

from models import (
    ScanRequest,
    ScanAndPlanResponse,
    ExecuteRequest,
    TestExecutionResult,
    AutoRunResponse
)
from scanner import extract_interactive_elements, wait_for_spa_ready
from ai_generator import generate_test_cases
from executor import execute_test_suite_parallel
import demo_target

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("bytesalt.main")

app = FastAPI(
    title="Bytesalt Autonomous QA Testing Platform",
    description="Web-Only Autonomous AI QA Platform simulating user behavior and catching backend bugs in parallel",
    version="1.0.0"
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the Built-in Realistic Buggy Demo Target App
app.include_router(demo_target.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "platform": "Bytesalt Autonomous AI QA",
        "timestamp": time.time()
    }


@app.post("/api/scan-and-plan", response_model=ScanAndPlanResponse)
async def scan_and_plan(req: ScanRequest):
    """
    1. Launches Playwright Chromium instance.
    2. Injects Auth Token into localStorage if provided.
    3. Scans live DOM for interactive elements and tags them with data-bytesalt-id.
    4. Distills clean JSON inventory without raw HTML.
    5. Sends inventory to LLM test case generator.
    """
    logger.info(f"Initiating scan for URL: {req.url} (mode={req.mode}, headless={req.headless})")
    elements = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=req.headless,
                args=["--disable-dev-shm-usage", "--no-sandbox"]
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                ignore_https_errors=True
            )

            if req.auth_token:
                init_script = f"""
                try {{
                    window.localStorage.setItem({json.dumps(req.auth_storage_key)}, {json.dumps(req.auth_token)});
                }} catch (e) {{}}
                """
                await context.add_init_script(init_script)

            page = await context.new_page()
            await page.goto(req.url, wait_until="domcontentloaded", timeout=25000)
            await wait_for_spa_ready(page, max_wait_seconds=12)

            elements = await extract_interactive_elements(page)
            await browser.close()

    except Exception as e:
        logger.error(f"Failed to scan target URL '{req.url}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to scan target URL: {str(e)}")

    if not elements:
        raise HTTPException(
            status_code=400,
            detail=f"No visible interactive elements detected at {req.url}. Verify URL is reachable."
        )

    # Generate Test Cases via LLM Architect
    test_cases = await generate_test_cases(
        elements,
        target_url=req.url,
        mode=req.mode,
        api_key=req.openai_api_key,
        custom_context=req.custom_context
    )

    return ScanAndPlanResponse(
        url=req.url,
        mode=req.mode,
        elements=elements,
        test_cases=test_cases
    )


@app.post("/api/execute", response_model=List[TestExecutionResult])
async def execute_tests(req: ExecuteRequest):
    """
    Executes all generated test cases in parallel across isolated Playwright BrowserContexts.
    Intercepts network requests (XHR/fetch), captures console errors, and produces base64 screenshots.
    """
    if not req.test_cases:
        raise HTTPException(status_code=400, detail="No test cases supplied for execution.")

    try:
        results = await execute_test_suite_parallel(req)
        return results
    except Exception as e:
        logger.error(f"Execution error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Parallel execution failed: {str(e)}")


@app.post("/api/auto-run", response_model=AutoRunResponse)
async def auto_run_pipeline(req: ScanRequest):
    """
    One-click Autonomous QA Pipeline:
    Scan -> AI Plan Generation -> Parallel Execution -> KPI Aggregation.
    """
    start_total = time.time()
    scan_plan = await scan_and_plan(req)

    exec_req = ExecuteRequest(
        url=req.url,
        auth_token=req.auth_token,
        auth_storage_key=req.auth_storage_key,
        test_cases=scan_plan.test_cases,
        headless=req.headless,
        openai_api_key=req.openai_api_key,
        custom_context=req.custom_context,
        execution_mode=req.execution_mode,
        step_delay_ms=req.step_delay_ms,
        human_typing=req.human_typing,
        highlight_element=req.highlight_element
    )

    results = await execute_tests(exec_req)
    total_wall_ms = int((time.time() - start_total) * 1000)

    total_tests = len(results)
    passed_tests = sum(1 for r in results if r.status == "PASS")
    failed_tests = sum(1 for r in results if r.status != "PASS")
    serial_sum_ms = sum(r.execution_time_ms for r in results)
    speedup = round(serial_sum_ms / max(total_wall_ms, 1), 2) if serial_sum_ms > total_wall_ms else 1.0

    summary = {
        "total_tests": total_tests,
        "passed": passed_tests,
        "failed": failed_tests,
        "pass_rate_pct": round((passed_tests / total_tests) * 100, 1) if total_tests > 0 else 0,
        "wall_time_ms": total_wall_ms,
        "serial_time_ms": serial_sum_ms,
        "parallel_speedup": f"{speedup}x"
    }

    return AutoRunResponse(
        url=req.url,
        mode=req.mode,
        elements=scan_plan.elements,
        test_cases=scan_plan.test_cases,
        results=results,
        summary=summary
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
