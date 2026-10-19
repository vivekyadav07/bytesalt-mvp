import asyncio
import logging
from typing import List
from playwright.async_api import Page
from models import InteractiveElement

logger = logging.getLogger("bytesalt.scanner")


async def wait_for_spa_ready(page: Page, max_wait_seconds: int = 12) -> None:
    """
    Intelligent SPA & Async Component Hydration Waiter:
    Polls until visible interactive elements (input, button, a) are rendered into the DOM,
    handling client-side routing (e.g. Vue/React/Angular /#/... hash routes) and loading spinners.
    """
    # 1. Wait for loading spinners to disappear if present
    try:
        spinner_loc = page.locator("#index_init_spinner, .index_spinner, .spinner, [class*='spinner'], [class*='loading-indicator']")
        if await spinner_loc.count() > 0:
            logger.info("Detected initial loading spinner. Waiting for it to hide...")
            await spinner_loc.first.wait_for(state="hidden", timeout=8000)
    except Exception:
        pass

    # 2. Poll for interactive elements
    selector = 'input:not([type="hidden"]), button, a, select, textarea, [role="button"]'
    loop = asyncio.get_event_loop()
    start_time = loop.time()
    while (loop.time() - start_time) < max_wait_seconds:
        try:
            loc = page.locator(selector)
            count = await loc.count()
            if count > 0:
                first_visible = False
                for i in range(min(count, 5)):
                    if await loc.nth(i).is_visible():
                        first_visible = True
                        break
                if first_visible:
                    # Brief settling pause for Vue/React reactivity
                    await page.wait_for_timeout(600)
                    logger.info(f"SPA rendered {count} interactive elements successfully.")
                    return
        except Exception:
            pass
        await page.wait_for_timeout(400)
    logger.info("SPA ready poll finished.")


async def extract_interactive_elements(page: Page) -> List[InteractiveElement]:
    """
    Smart DOM Distillation:
    Scans the live DOM for visible interactive elements (input, button, a, select, textarea, [role="button"]),
    tags each element with `data-bytesalt-id="el_X"`, and extracts a clean, structured inventory
    with both smart labels and deterministic CSS selectors as fallbacks.
    Never sends full raw HTML to LLM.
    """
    js_extract_script = """
    (() => {
        const selector = 'input, button, a, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"]';
        const rawElements = Array.from(document.querySelectorAll(selector));
        const items = [];
        let index = 0;

        for (const el of rawElements) {
            // Check visibility
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                continue;
            }

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                continue;
            }

            // Exclude hidden inputs
            const tag = el.tagName.toLowerCase();
            if (tag === 'input' && (el.type === 'hidden')) {
                continue;
            }

            index++;
            const bytesaltId = `el_${index}`;
            el.setAttribute('data-bytesalt-id', bytesaltId);

            // Compute Human-Readable Label
            let label = '';
            if (el.id) {
                const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
                if (labelEl) label = labelEl.innerText.trim();
            }
            if (!label) {
                const parentLabel = el.closest('label');
                if (parentLabel) label = parentLabel.innerText.trim();
            }
            if (!label && el.getAttribute('aria-label')) {
                label = el.getAttribute('aria-label').trim();
            }
            if (!label && el.placeholder) {
                label = el.placeholder.trim();
            }
            if (!label && (tag === 'button' || el.getAttribute('role') === 'button' || tag === 'a')) {
                label = el.innerText.trim() || el.textContent.trim();
            }
            if (!label && el.value && (el.type === 'submit' || el.type === 'button')) {
                label = el.value.trim();
            }
            if (!label && el.name) {
                label = el.name;
            }
            if (!label && el.title) {
                label = el.title;
            }

            // Clean multi-line or long labels
            label = (label || '').replace(/\\s+/g, ' ').trim().slice(0, 80);

            // Compute Deterministic Fallback CSS Selector
            let cssSelector = '';
            if (el.id) {
                cssSelector = `#${CSS.escape(el.id)}`;
            } else if (el.name) {
                cssSelector = `${tag}[name="${CSS.escape(el.name)}"]`;
            } else if (el.placeholder) {
                cssSelector = `${tag}[placeholder="${CSS.escape(el.placeholder)}"]`;
            } else if (el.getAttribute('data-testid')) {
                cssSelector = `[data-testid="${CSS.escape(el.getAttribute('data-testid'))}"]`;
            } else if (label && (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button')) {
                const cleanLabel = label.replace(/"/g, '\\"').slice(0, 30);
                cssSelector = `${tag}:has-text("${cleanLabel}")`;
            } else {
                const parent = el.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter(c => c.tagName.toLowerCase() === tag);
                    const idx = siblings.indexOf(el) + 1;
                    cssSelector = `${tag}:nth-of-type(${idx})`;
                } else {
                    cssSelector = tag;
                }
            }

            items.push({
                id: bytesaltId,
                tag: tag,
                type: el.type || '',
                label: label,
                placeholder: el.placeholder || '',
                name: el.name || '',
                required: !!el.required,
                href: el.getAttribute('href') || null,
                css_selector: cssSelector
            });
        }
        return items;
    })()
    """
    raw_data = await page.evaluate(js_extract_script)
    elements = [InteractiveElement(**item) for item in raw_data]
    logger.info(f"Distilled {len(elements)} interactive elements from {page.url}")
    return elements
