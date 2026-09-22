/**
 * The contact form, driven in a real browser.
 *
 * The general suites cover the page: axe audits it, keyboard-qa counts its
 * controls and proves none is unlabelled. Neither presses a key into a field or
 * submits anything, so neither can see the four states, the error association,
 * or what the layout does at 390px with a message in it. This does.
 *
 * Delivery is intercepted rather than performed. The provider is not reachable
 * from here and would need a credential that is deliberately absent, so the
 * route is fulfilled at the network layer: that is honest about what is being
 * checked, which is the form's behaviour given an answer, not the mail path.
 * The mail path is covered by test/novra/contact-form.test.ts against the real
 * route handler, and by the live 502 the uncredentialed server actually returns.
 *
 *   node scripts/contact-form-qa.mjs [--base http://127.0.0.1:3000]
 */
import { chromium } from "playwright-core";

const baseArg = process.argv.indexOf("--base");
const BASE = baseArg > -1 ? process.argv[baseArg + 1] : "http://127.0.0.1:3000";
const URL = `${BASE}/contact/`;
const WIDTHS = [390, 620, 1024, 1600];

const failures = [];
const fail = (message) => {
  failures.push(message);
  console.log(`FAIL  ${message}`);
};
const ok = (message) => console.log(`ok    ${message}`);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});

/** Fulfil the delivery endpoint so the success path can be observed. */
async function stubDelivery(page, body = { ok: true }, status = 200) {
  await page.route("**/api/contact/", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

const FILL = {
  name: "Institutional Reviewer",
  email: "reviewer@example.org",
  organization: "Example Development Bank",
  subject: "Request for the reliability working paper",
  message:
    "We are reviewing approaches to reliability budgeting for agentic systems and would like a copy of the working paper referenced in your Research section.",
};

async function fillForm(page) {
  await page.getByLabel(/^Name/).fill(FILL.name);
  await page.getByLabel(/^Email/).fill(FILL.email);
  await page.getByLabel(/^Organization/).fill(FILL.organization);
  await page.getByLabel(/^Inquiry type/).selectOption("Research");
  await page.getByLabel(/^Subject/).fill(FILL.subject);
  await page.getByLabel(/^Message/).fill(FILL.message);
}

/* ---------------------------------------------------------------- states */

{
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle" });

  // The live region must exist before it has anything to say, or its first
  // message is announced to nobody.
  const liveAtRest = await page.locator('[role="status"][aria-live="polite"]').count();
  if (liveAtRest === 1) ok("status region is present in the DOM before any submission");
  else fail(`expected 1 idle live region, found ${liveAtRest}`);

  // DEFAULT -> validation errors, without a request leaving the page.
  let requested = false;
  page.on("request", (r) => {
    if (r.url().includes("/api/contact")) requested = true;
  });
  await page.getByRole("button", { name: "Send Message" }).click();
  await page.waitForTimeout(250);

  const errorCount = await page.locator("form p[id$='-error']").count();
  if (errorCount === 5) ok("empty submit reports all five required fields");
  else fail(`expected 5 field errors on empty submit, found ${errorCount}`);
  if (!requested) ok("an invalid form never reaches the network");
  else fail("an invalid form issued a request");

  // Each message must be reachable from its own control.
  const associated = await page.evaluate(() => {
    const out = [];
    for (const field of document.querySelectorAll("form [aria-invalid='true']")) {
      const id = field.getAttribute("aria-describedby");
      const target = id ? document.getElementById(id) : null;
      out.push({
        name: field.getAttribute("name"),
        described: Boolean(target && target.textContent.trim()),
      });
    }
    return out;
  });
  const unassociated = associated.filter((f) => !f.described).map((f) => f.name);
  if (associated.length === 5 && unassociated.length === 0) {
    ok("every invalid control points at its own non-empty message");
  } else {
    fail(`aria-describedby broken for: ${unassociated.join(", ") || "(none marked invalid)"}`);
  }

  const focused = await page.evaluate(() => document.activeElement?.getAttribute("name"));
  if (focused === "name") ok("focus moves to the first invalid field");
  else fail(`expected focus on "name" after a failed submit, got "${focused}"`);

  // An invalid address is caught on its own.
  await page.getByLabel(/^Email/).fill("not-an-address");
  await page.getByRole("button", { name: "Send Message" }).click();
  await page.waitForTimeout(200);
  const emailError = await page.locator("form [name='email'] + p, form p[id$='email-error']").first().textContent();
  if ((emailError ?? "").includes("valid email")) ok("an invalid address is reported on the email field");
  else fail(`expected an email-format message, got "${emailError}"`);

  await page.close();
}

/* --------------------------------------------------------------- success */

{
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await stubDelivery(page);
  await page.goto(URL, { waitUntil: "networkidle" });
  await fillForm(page);
  await page.getByRole("button", { name: "Send Message" }).click();

  await page.waitForSelector("text=Thank you. Your message has been sent successfully.", { timeout: 5000 });
  ok("SUCCESS state announces the approved confirmation");

  const cleared = await page.evaluate(() =>
    ["name", "email", "organization", "subject", "message"].every(
      (n) => document.querySelector(`form [name="${n}"]`).value === "",
    ),
  );
  if (cleared) ok("the form is cleared after a successful send");
  else fail("fields still hold their values after success");

  const live = await page.locator('[role="status"]').textContent();
  if ((live ?? "").includes("Thank you")) ok("the confirmation is inside the live region");
  else fail("the confirmation is not in the live region");

  await page.close();
}

/* ----------------------------------------------------------------- error */

{
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await stubDelivery(page, { ok: false, error: "delivery" }, 502);
  await page.goto(URL, { waitUntil: "networkidle" });
  await fillForm(page);
  await page.getByRole("button", { name: "Send Message" }).click();

  await page.waitForSelector("text=We couldn't send your message.", { timeout: 5000 });
  ok("ERROR state announces the approved failure message and the mailto fallback");

  const preserved = await page.evaluate(
    () => document.querySelector('form [name="message"]').value.length > 0,
  );
  if (preserved) ok("what the visitor typed survives a delivery failure");
  else fail("the message was discarded on a recoverable error");

  await page.close();
}

/* -------------------------------------------------- duplicate submission */

{
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  let attempts = 0;
  await page.route("**/api/contact/", async (route) => {
    attempts += 1;
    // Hold the request open so a second click lands while the first is in flight.
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await fillForm(page);

  const button = page.getByRole("button", { name: /Send Message|Sending/ });
  await button.click();
  await page.waitForTimeout(150);

  const disabled = await button.isDisabled();
  if (disabled) ok("SUBMITTING disables the button while the request is open");
  else fail("the submit button stayed enabled during submission");

  await button.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1400);
  if (attempts === 1) ok(`a second click during submission sends nothing (attempts=${attempts})`);
  else fail(`duplicate submission: ${attempts} requests issued`);

  await page.close();
}

/* -------------------------------------------------------------- keyboard */

{
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle" });

  await page.getByLabel(/^Name/).focus();
  const reached = [];
  for (let i = 0; i < 8; i += 1) {
    const current = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        name: el.getAttribute("name") ?? el.tagName.toLowerCase(),
        tag: el.tagName.toLowerCase(),
        // A focus ring the global stylesheet provides via :focus-visible.
        outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      };
    });
    if (current) reached.push(current);
    await page.keyboard.press("Tab");
  }

  const order = reached.map((r) => r.name);
  const expected = ["name", "email", "organization", "inquiryType", "subject", "message"];
  if (expected.every((name, i) => order[i] === name)) ok(`tab order follows the visual order: ${expected.join(" > ")}`);
  else fail(`unexpected tab order: ${order.join(" > ")}`);

  if (!order.includes("website")) ok("the honeypot is not reachable by keyboard");
  else fail("the honeypot is in the tab order");

  const buttonReached = order.includes("button");
  if (buttonReached) ok("Send Message is reachable by keyboard after the fields");
  else fail(`the submit button was not reached; order was ${order.join(" > ")}`);

  const unfocusable = reached.filter((r) => !r.outline).map((r) => r.name);
  if (unfocusable.length === 0) ok(`all ${reached.length} tab stops show a visible focus indicator`);
  else fail(`no visible focus indicator on: ${unfocusable.join(", ")}`);

  // Nothing traps: Shift+Tab walks back out of the form.
  await page.getByLabel(/^Name/).focus();
  await page.keyboard.press("Shift+Tab");
  const escaped = await page.evaluate(() => !document.activeElement?.closest("form"));
  if (escaped) ok("Shift+Tab leaves the form — no keyboard trap");
  else fail("Shift+Tab did not leave the form");

  await page.close();
}

/* ------------------------------------------------------------ responsive */

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: width < 620 ? 844 : 900 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await fillForm(page);
  await page.waitForTimeout(120);

  const metrics = await page.evaluate(() => {
    const form = document.querySelector("form");
    const submit = form.querySelector("button[type=submit]");
    const fallback = form.querySelector("a[href^='mailto:']");
    const inputs = [...form.querySelectorAll("input:not([tabindex='-1']), select, textarea")];
    const boxes = inputs.map((el) => el.getBoundingClientRect());
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      submitHeight: Math.round(submit.getBoundingClientRect().height),
      submitWidth: Math.round(submit.getBoundingClientRect().width),
      minControlHeight: Math.round(Math.min(...boxes.map((b) => b.height))),
      // Distinct left edges: one column means every control starts in the
      // same place.
      columns: new Set(boxes.map((b) => Math.round(b.left))).size,
      fallbackRight: Math.round(fallback.getBoundingClientRect().right),
      formRight: Math.round(form.getBoundingClientRect().right),
    };
  });

  const label = `${width}px`;
  if (!metrics.overflow) ok(`${label}: no horizontal overflow (${metrics.scrollWidth} <= ${metrics.innerWidth})`);
  else fail(`${label}: horizontal overflow — scrollWidth ${metrics.scrollWidth} > ${metrics.innerWidth}`);

  if (metrics.minControlHeight >= 44) ok(`${label}: every control is at least 44px tall (min ${metrics.minControlHeight})`);
  else fail(`${label}: a control is only ${metrics.minControlHeight}px tall`);

  if (metrics.submitHeight >= 44) ok(`${label}: Send Message is ${metrics.submitHeight}px tall`);
  else fail(`${label}: Send Message is only ${metrics.submitHeight}px tall`);

  if (width < 620) {
    if (metrics.columns === 1) ok(`${label}: fields stack in a single column`);
    else fail(`${label}: expected one column, found ${metrics.columns}`);
    if (metrics.submitWidth > width * 0.7) ok(`${label}: Send Message spans the column (${metrics.submitWidth}px)`);
    else fail(`${label}: Send Message is only ${metrics.submitWidth}px wide on a phone`);
  } else if (metrics.columns >= 2) {
    ok(`${label}: the short fields pair into ${metrics.columns} columns`);
  } else {
    fail(`${label}: expected a two-column arrangement, found ${metrics.columns}`);
  }

  if (metrics.fallbackRight <= metrics.formRight + 1) ok(`${label}: the email fallback stays inside the card`);
  else fail(`${label}: the email fallback overflows by ${metrics.fallbackRight - metrics.formRight}px`);

  await page.screenshot({
    path: `../artifacts/frontend-qa/contact-form-${width}.png`,
    fullPage: width === 1600,
  });
  await page.close();
}

await browser.close();

if (failures.length) {
  console.log(`\nCONTACT_FORM_QA=FAIL (${failures.length} failures)`);
  process.exit(1);
}
console.log(`\nCONTACT_FORM_QA=PASS (states, keyboard, and ${WIDTHS.length} widths)`);
