import json
import logging
import os
from typing import List, Optional
from dotenv import load_dotenv
from openai import AsyncOpenAI
from models import InteractiveElement, TestCase, TestStep

load_dotenv()
logger = logging.getLogger("bytesalt.ai_generator")


SYSTEM_PROMPT = """You are Bytesalt's Principal QA Automation Architect and Lead LLM Test Engineer.
Your job is to analyze distilled interactive DOM element inventories from live web applications and generate precise, executable, production-grade automated Test Cases.

CRITICAL USER CONTEXT & CUSTOM INSTRUCTIONS:
The user can provide custom instructions, valid credentials, or specific test requirements (e.g., 'this is correct email and pass', 'this is sign in page and also go on sign up page and test').
You MUST strictly evaluate and follow the user's instructions:
1. Valid Credentials: If the user provides specific login values (e.g. email, username/ID, password, OTP), USE THOSE EXACT VALUES for the Positive (Happy Path) test case!
2. Specific Flows: If the user asks to test another page/modal (e.g. 'go on sign up page and test', 'verify password recovery', etc.), generate a test case that clicks the corresponding interactive link/button (e.g., '회원가입' / '#/sign-up' or 'Sign Up') to explore and verify that flow!
3. Field Value Semantics: Infer the purpose of every input field from its tag, type, name, placeholder, and label (including international languages like Korean, Japanese, Spanish, etc. e.g. 'ID'/'아이디' -> Username, '비밀번호' -> Password, 'OTP'/'인증번호' -> OTP Code, '로그인' -> Login Button).

MODES:
1. single_page:
   Generate exactly 4 distinct, rigorous test cases:
   - TC_01 (Validation_Empty): Attempt submission or main action directly without filling required inputs.
   - TC_02 (Negative_Edge): Inject boundary values, invalid email formats, or SQLi/special payloads (' OR 1=1--, <script>alert(1)</script>).
   - TC_03 (Positive): Happy Path with realistic, high-quality form data (or user-provided valid credentials), followed by primary action click.
   - TC_04 (Navigation / User Requested Flow): Test user-requested routes (e.g. Sign-Up page link), tab switches, or secondary actions.

2. integration_flow:
   Generate chained, multi-step end-to-end integration flows across components, modals, or pages:
   - Create entity -> Verify in list -> View Details -> Edit/Update entity -> Verify updated state.
   - Rule: Destructive actions like Delete or Logout must be scheduled strictly at the end or omitted.
"""


def _infer_semantic_input_value(el: InteractiveElement, category: str = "Positive") -> str:
    text = f"{el.label} {el.placeholder} {el.name} {el.id}".lower()

    if category == "Negative_Edge":
        if any(k in text for k in ["id", "user", "name", "아이디", "이름"]):
            return "' OR 1=1--"
        elif any(k in text for k in ["email", "이메일"]):
            return "invalid-email-no-domain"
        elif any(k in text for k in ["otp", "인증", "code", "pin"]):
            return "99999999999"
        elif any(k in text for k in ["pwd", "pass", "비밀번호"]):
            return "<script>alert(1)</script>"
        return "' OR 1=1--"

    # Positive category
    if any(k in text for k in ["id", "아이디", "username", "login_id"]):
        return "qa_user_test"
    elif any(k in text for k in ["비밀번호", "password", "pwd"]):
        return "Passw0rd!2026"
    elif any(k in text for k in ["otp", "인증", "pin"]):
        return "123456"
    elif any(k in text for k in ["email", "이메일"]) or el.type == "email":
        return "qa.tester@samsungsds.com"
    elif any(k in text for k in ["phone", "tel", "전화"]):
        return "010-1234-5678"
    elif any(k in text for k in ["name", "이름"]):
        return "Alex Morgan"
    else:
        return "SampleValidValue"


def _generate_rule_based_fallback(elements: List[InteractiveElement], mode: str, custom_context: Optional[str] = None) -> List[TestCase]:
    """
    Deterministic rule-based QA test generator fallback.
    Incorporates user-provided custom context, credentials, or requested flows.
    """
    logger.info("Using smart rule-based test case generator fallback")
    inputs = [el for el in elements if el.tag in ("input", "textarea") and el.type not in ("submit", "button", "hidden")]
    selects = [el for el in elements if el.tag == "select"]
    buttons = [el for el in elements if el.tag == "button" or el.type in ("submit", "button") or "btn" in el.css_selector]
    links = [el for el in elements if el.tag == "a" or "details" in el.label.lower() or "edit" in el.label.lower()]

    # Extract user-provided credentials from context if available
    user_cred_id = None
    user_cred_pass = None
    user_wants_signup = False

    if custom_context:
        ctx_lower = custom_context.lower()
        import re
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', custom_context)
        if email_match:
            user_cred_id = email_match.group(0)
        else:
            id_match = re.search(r'(?:id|user|username|아이디)\s*[:=]\s*([^\s,;]+)', custom_context, re.IGNORECASE)
            if id_match:
                user_cred_id = id_match.group(1).strip("'\"")

        pass_match = re.search(r'(?:pass|password|pwd|비밀번호)\s*[:=]\s*([^\s,;]+)', custom_context, re.IGNORECASE)
        if pass_match:
            user_cred_pass = pass_match.group(1).strip("'\"")

        if any(k in ctx_lower for k in ["sign up", "signup", "회원가입", "register", "registration"]):
            user_wants_signup = True

    # Prioritize submit/login button as primary
    primary_btn = None
    for b in buttons:
        btn_txt = f"{b.label} {b.name} {b.css_selector}".lower()
        if any(k in btn_txt for k in ["로그인", "login", "sign in", "signin", "submit", "create", "완료"]):
            primary_btn = b
            break
    if not primary_btn and buttons:
        primary_btn = buttons[-1] if len(buttons) > 1 and "otp" in buttons[0].label.lower() else buttons[0]
    if not primary_btn and links:
        primary_btn = links[0]

    if mode == "integration_flow":
        # Chained multi-page flow: Create -> Verify in List -> View Details -> Edit/Update
        steps: List[TestStep] = []
        step_idx = 1

        for el in inputs:
            val = _infer_semantic_input_value(el, "Positive")
            if user_cred_id and any(k in f"{el.label} {el.name} {el.placeholder}".lower() for k in ["id", "user", "email"]):
                val = user_cred_id
            elif user_cred_pass and any(k in f"{el.label} {el.name} {el.placeholder}".lower() for k in ["pass", "pwd", "비밀번호"]):
                val = user_cred_pass

            steps.append(TestStep(
                step_no=step_idx,
                action="fill",
                target_id=el.id,
                css_selector=el.css_selector,
                value=val,
                description=f"Fill '{el.label or el.placeholder or el.name}' with '{val}'"
            ))
            step_idx += 1

        if primary_btn:
            steps.append(TestStep(
                step_no=step_idx,
                action="click",
                target_id=primary_btn.id,
                css_selector=primary_btn.css_selector,
                value=None,
                description=f"Submit creation form via '{primary_btn.label}'"
            ))
            step_idx += 1

        steps.append(TestStep(
            step_no=step_idx,
            action="wait",
            target_id=None,
            css_selector=None,
            value="1500",
            description="Wait for list update and table refresh"
        ))
        step_idx += 1

        edit_or_view = next((el for el in elements if "edit" in el.label.lower() or "detail" in el.label.lower()), None)
        if edit_or_view:
            steps.append(TestStep(
                step_no=step_idx,
                action="click",
                target_id=edit_or_view.id,
                css_selector=edit_or_view.css_selector,
                value=None,
                description=f"Click '{edit_or_view.label}' to view or edit item"
            ))
            step_idx += 1
            steps.append(TestStep(
                step_no=step_idx,
                action="wait",
                target_id=None,
                css_selector=None,
                value="1000",
                description="Wait for detail/edit view to render"
            ))

        return [
            TestCase(
                tc_id="TC_INT_01",
                title="Chained Integration: Create User -> Verify in List -> Edit & Update Flow",
                category="Integration_Chained",
                steps=steps,
                expected_ui_behavior="User created successfully, visible in table, and updated via inline edit",
                expected_api_status=200
            )
        ]

    # Single-page mode: 4 distinct test cases
    test_cases: List[TestCase] = []

    # TC_01: Validation_Empty
    tc1_steps: List[TestStep] = []
    if primary_btn:
        tc1_steps.append(TestStep(
            step_no=1,
            action="click",
            target_id=primary_btn.id,
            css_selector=primary_btn.css_selector,
            value=None,
            description=f"Directly trigger '{primary_btn.label}' without providing required fields"
        ))
    test_cases.append(TestCase(
        tc_id="TC_01",
        title="Form Validation on Empty Required Submissions",
        category="Validation_Empty",
        steps=tc1_steps,
        expected_ui_behavior="Form should halt submission and display required validation notices",
        expected_api_status=400
    ))

    # TC_02: Negative_Edge (SQLi / Special characters / Malformed input)
    tc2_steps: List[TestStep] = []
    step_no = 1
    for el in inputs:
        payload = _infer_semantic_input_value(el, "Negative_Edge")
        tc2_steps.append(TestStep(
            step_no=step_no,
            action="fill",
            target_id=el.id,
            css_selector=el.css_selector,
            value=payload,
            description=f"Inject edge/negative payload '{payload}' into '{el.label or el.name}'"
        ))
        step_no += 1
    if primary_btn:
        tc2_steps.append(TestStep(
            step_no=step_no,
            action="click",
            target_id=primary_btn.id,
            css_selector=primary_btn.css_selector,
            value=None,
            description=f"Submit with edge-case payloads via '{primary_btn.label}'"
        ))
    test_cases.append(TestCase(
        tc_id="TC_02",
        title="Negative Edge & SQLi / Malformed Payload Resilience",
        category="Negative_Edge",
        steps=tc2_steps,
        expected_ui_behavior="Application gracefully handles invalid/malformed data without 500 crash",
        expected_api_status=400
    ))

    # TC_03: Positive Happy Path (Using user credentials if provided)
    tc3_steps: List[TestStep] = []
    step_no = 1
    for el in inputs:
        val = _infer_semantic_input_value(el, "Positive")
        if user_cred_id and any(k in f"{el.label} {el.name} {el.placeholder}".lower() for k in ["id", "user", "email"]):
            val = user_cred_id
        elif user_cred_pass and any(k in f"{el.label} {el.name} {el.placeholder}".lower() for k in ["pass", "pwd", "비밀번호"]):
            val = user_cred_pass

        tc3_steps.append(TestStep(
            step_no=step_no,
            action="fill",
            target_id=el.id,
            css_selector=el.css_selector,
            value=val,
            description=f"Enter valid data '{val}' into '{el.label or el.placeholder or el.name}'"
        ))
        step_no += 1

    for sel in selects:
        tc3_steps.append(TestStep(
            step_no=step_no,
            action="select",
            target_id=sel.id,
            css_selector=sel.css_selector,
            value="QA Architect",
            description=f"Select standard option for '{sel.label or sel.name}'"
        ))
        step_no += 1

    if primary_btn:
        tc3_steps.append(TestStep(
            step_no=step_no,
            action="click",
            target_id=primary_btn.id,
            css_selector=primary_btn.css_selector,
            value=None,
            description=f"Submit valid form via '{primary_btn.label}'"
        ))
    test_cases.append(TestCase(
        tc_id="TC_03",
        title="Positive Happy Path Submission with Valid Inputs" + (" (User Credentials Applied)" if (user_cred_id or user_cred_pass) else ""),
        category="Positive",
        steps=tc3_steps,
        expected_ui_behavior="Successful submission, confirmation message or record displayed",
        expected_api_status=200
    ))

    # TC_04: Navigation / User Requested Flow (e.g. Sign-Up)
    tc4_steps: List[TestStep] = []
    tc4_title = "Navigation & Secondary Interactive Action Check"
    target_link = None

    if user_wants_signup:
        # Search specifically for sign-up link (e.g., 회원가입 or #/sign-up)
        for candidate in elements:
            label_or_href = f"{candidate.label} {candidate.href} {candidate.css_selector}".lower()
            if any(k in label_or_href for k in ["회원가입", "sign-up", "signup", "register"]):
                target_link = candidate
                tc4_title = f"User Requested Flow: Navigate to '{candidate.label}' (Sign-Up Page)"
                break

    if not target_link:
        for candidate in elements:
            if candidate.id != (primary_btn.id if primary_btn else None) and (candidate.tag == "a" or candidate.tag == "button"):
                target_link = candidate
                break

    if target_link:
        tc4_steps.append(TestStep(
            step_no=1,
            action="click",
            target_id=target_link.id,
            css_selector=target_link.css_selector,
            value=None,
            description=f"Navigate to '{target_link.label}' ({target_link.href or 'view'})"
        ))
        tc4_steps.append(TestStep(
            step_no=2,
            action="wait",
            target_id=None,
            css_selector=None,
            value="1500",
            description="Wait for target route or page to render"
        ))

    test_cases.append(TestCase(
        tc_id="TC_04",
        title=tc4_title,
        category="Navigation_Link_Check" if mode == "single_page" else "Integration_Chained",
        steps=tc4_steps,
        expected_ui_behavior="Navigation succeeds and target view renders without errors",
        expected_api_status=200
    ))

    return test_cases


async def generate_test_cases(
    elements: List[InteractiveElement],
    target_url: str,
    mode: str = "single_page",
    api_key: Optional[str] = None,
    custom_context: Optional[str] = None
) -> List[TestCase]:
    """
    Generates comprehensive automated test cases using OpenAI gpt-4o structured JSON output,
    strictly incorporating user context, credentials, and requested test flows.
    """
    openai_key = api_key or os.getenv("OPENAI_API_KEY")
    if not openai_key or "your_openai_api_key" in openai_key or openai_key.strip() == "":
        logger.warning("No valid OPENAI_API_KEY detected. Utilizing built-in smart test generator.")
        return _generate_rule_based_fallback(elements, mode, custom_context)

    client = AsyncOpenAI(api_key=openai_key)

    user_content = {
        "target_url": target_url,
        "mode": mode,
        "user_custom_instructions": custom_context.strip() if custom_context else "None provided (use standard comprehensive QA test suite)",
        "interactive_elements_inventory": [el.model_dump() for el in elements]
    }

    schema_instruction = """
    Return a JSON object conforming exactly to this structure:
    {
      "test_cases": [
        {
          "tc_id": "TC_01",
          "title": "Clear scenario title",
          "category": "Positive" | "Validation_Empty" | "Negative_Edge" | "Integration_Chained",
          "steps": [
            {
              "step_no": 1,
              "action": "fill" | "click" | "select" | "wait" | "assert_text",
              "target_id": "el_1",
              "css_selector": "input#name",
              "value": "string value or null",
              "description": "Readable explanation of step"
            }
          ],
          "expected_ui_behavior": "What UI should render",
          "expected_api_status": 200
        }
      ]
    }
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + "\n" + schema_instruction},
                {"role": "user", "content": json.dumps(user_content)}
            ],
            temperature=0.2
        )

        content = response.choices[0].message.content
        parsed = json.loads(content)
        raw_tcs = parsed.get("test_cases", [])
        validated_tcs = [TestCase(**tc) for tc in raw_tcs]

        if not validated_tcs:
            logger.warning("OpenAI returned 0 test cases, falling back to rule-based generator.")
            return _generate_rule_based_fallback(elements, mode, custom_context)

        logger.info(f"OpenAI successfully generated {len(validated_tcs)} test cases considering user context.")
        return validated_tcs

    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}. Falling back to rule-based generator.", exc_info=True)
        return _generate_rule_based_fallback(elements, mode, custom_context)

