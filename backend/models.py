from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    url: str = Field(..., description="Target web application URL to scan")
    auth_token: Optional[str] = Field(None, description="Optional JWT or session token for auth injection")
    auth_storage_key: str = Field("token", description="localStorage key for auth token injection")
    mode: str = Field("single_page", description="'single_page' or 'integration_flow'")
    headless: bool = Field(False, description="Whether to run Chromium headlessly (default: False for live visual execution)")
    openai_api_key: Optional[str] = Field(None, description="Optional user-provided OpenAI API key for AI test generation")
    custom_context: Optional[str] = Field(None, description="User-provided instructions, valid credentials, or custom test goals for the AI")
    execution_mode: str = Field("single_tab_step_by_step", description="'single_tab_step_by_step' (one tab, human eye pace) or 'parallel_tabs'")
    step_delay_ms: int = Field(1000, description="Visual delay in milliseconds between steps for human eye tracking")
    human_typing: bool = Field(True, description="Whether to type characters sequentially with visual keystrokes")
    highlight_element: bool = Field(True, description="Whether to draw a glowing highlight around the active element")


class InteractiveElement(BaseModel):
    id: str = Field(..., description="Bytesalt element identifier (e.g., el_1)")
    tag: str = Field(..., description="HTML tag name: input, button, a, select, textarea, etc.")
    type: str = Field("", description="Input/button type attribute")
    label: str = Field("", description="Computed human-readable label or text")
    placeholder: str = Field("", description="Placeholder attribute if present")
    name: str = Field("", description="Form name attribute if present")
    required: bool = Field(False, description="Whether element has required attribute")
    href: Optional[str] = Field(None, description="Link href if tag is 'a'")
    css_selector: str = Field(..., description="Deterministic fallback CSS selector")


class TestStep(BaseModel):
    step_no: int = Field(..., description="Sequence number of step")
    action: str = Field(..., description="'fill', 'click', 'select', 'wait', 'assert_text'")
    target_id: Optional[str] = Field(None, description="Target element id e.g. el_1")
    css_selector: Optional[str] = Field(None, description="Fallback CSS selector")
    value: Optional[str] = Field(None, description="Input string, select option, or wait ms")
    description: str = Field(..., description="Readable explanation of step")


class TestCase(BaseModel):
    tc_id: str = Field(..., description="Unique Test Case ID e.g. TC_01")
    title: str = Field(..., description="Descriptive title of the test scenario")
    category: str = Field(..., description="'Positive', 'Validation_Empty', 'Negative_Edge', 'Integration_Chained'")
    steps: List[TestStep] = Field(default_factory=list, description="Ordered steps to execute")
    expected_ui_behavior: str = Field(..., description="Expected UI outcome or error validation")
    expected_api_status: int = Field(200, description="Expected HTTP response status code")


class NetworkLog(BaseModel):
    url: str = Field(..., description="Intercepted request URL")
    method: str = Field(..., description="HTTP Method: GET, POST, PUT, DELETE, etc.")
    status: int = Field(..., description="HTTP response status code")
    request_payload: Optional[Any] = Field(None, description="Payload sent in request")
    response_body: Optional[Any] = Field(None, description="Body returned by server")


class CategorizedNetworkLogs(BaseModel):
    passed_200: List[NetworkLog] = Field(default_factory=list, description="APIs returning 200-299 OK status (compact bound list)")
    warnings_4xx: List[NetworkLog] = Field(default_factory=list, description="APIs returning 3xx/4xx warnings or client errors")
    failed_5xx: List[NetworkLog] = Field(default_factory=list, description="APIs returning 5xx server failures (full response body)")


class StepExecutionLog(BaseModel):
    step_no: int = Field(..., description="Step sequence number")
    action: str = Field(..., description="Action performed: fill, click, select, wait, assert_text")
    target: str = Field("", description="Target element ID, label, or selector")
    input_value: Optional[str] = Field(None, description="Exact input value entered during this step")
    description: str = Field(..., description="Readable explanation of what this step did")
    status: str = Field("SUCCESS", description="'SUCCESS' or 'FAILED'")
    detail: Optional[str] = Field(None, description="Additional step observation or error message")


class TestExecutionResult(BaseModel):
    tc_id: str = Field(..., description="Test Case ID")
    title: str = Field(..., description="Test Case Title")
    category: str = Field(..., description="Category")
    status: str = Field(..., description="'PASS', 'FAIL', or 'ERROR'")
    execution_time_ms: int = Field(..., description="Total execution time in milliseconds")
    final_url: str = Field(..., description="Final browser URL after test completion")
    ui_observation: str = Field(..., description="Observed UI state description")
    network_logs: List[NetworkLog] = Field(default_factory=list, description="Intercepted network requests")
    categorized_network: Optional[CategorizedNetworkLogs] = None
    console_errors: List[str] = Field(default_factory=list, description="Uncaught browser JS console errors")
    failure_reason: Optional[str] = Field(None, description="Reason for failure if status is FAIL/ERROR")
    screenshot_base64: Optional[str] = Field(None, description="Base64 encoded PNG final screenshot")
    step_logs: List[StepExecutionLog] = Field(default_factory=list, description="Detailed record of every step executed with exact inputs")
    readable_summary: str = Field("", description="Human-readable plain description of what ran, what input was given, and outcome")


class ScanAndPlanResponse(BaseModel):
    url: str
    mode: str
    elements: List[InteractiveElement]
    test_cases: List[TestCase]


class ExecuteRequest(BaseModel):
    url: str
    auth_token: Optional[str] = None
    auth_storage_key: str = "token"
    test_cases: List[TestCase]
    headless: bool = False
    openai_api_key: Optional[str] = None
    custom_context: Optional[str] = None
    execution_mode: str = Field("single_tab_step_by_step", description="'single_tab_step_by_step' (one tab, human eye pace) or 'parallel_tabs'")
    step_delay_ms: int = Field(1000, description="Visual delay in milliseconds between steps for human eye tracking")
    human_typing: bool = Field(True, description="Whether to type characters sequentially with visual keystrokes")
    highlight_element: bool = Field(True, description="Whether to draw a glowing highlight around the active element")


class AutoRunResponse(BaseModel):
    url: str
    mode: str
    elements: List[InteractiveElement]
    test_cases: List[TestCase]
    results: List[TestExecutionResult]
    summary: Dict[str, Any]
