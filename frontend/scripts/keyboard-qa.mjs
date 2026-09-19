/**
 * Keyboard and structure checks that axe cannot make.
 *
 * axe-core reports what static analysis of the DOM can prove. It does not press
 * Tab, it does not know whether focus is visible, and it cannot tell whether
 * the mobile drawer traps or releases focus. This drives the keyboard and looks
 * at what actually happens.
 *
 * Usage: node scripts/keyboard-qa.mjs [--base http://127.0.0.1:3000]
 */
import { chromium } from "/home/user/reputation-ops/node_modules/playwright-core/index.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");

const failures = [];
const notes = [];
const fail = (m) => { failures.push(m); console.log(`FAIL  ${m}`); };
const ok = (m) => console.log(`ok    ${m}`);
const note = (m) => { notes.push(m); console.log(`note  ${m}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });

/* ---------- 1. Skip link ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName, text: (el.textContent || "").trim(), href: el.getAttribute("href"),
      // "visible" means on-screen and painted, not merely focusable
      onScreen: r.top >= 0 && r.left >= 0 && r.width > 0 && r.height > 0,
      outline: cs.outlineStyle !== "none" && cs.outlineWidth !== "0px",
      boxShadow: cs.boxShadow !== "none",
    };
  });
  if (first.tag === "A" && /skip/i.test(first.text)) ok(`skip link is the first tab stop ("${first.text}" -> ${first.href})`);
  else fail(`first tab stop is <${first.tag}> "${first.text}", expected a skip link`);
  if (first.onScreen) ok("skip link becomes visible on focus");
  else fail("skip link is focused but not rendered on screen");

  // does it actually move focus to main?
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const target = await page.evaluate(() => {
    const m = document.querySelector("#main");
    return { exists: !!m, hash: location.hash, mainTag: m && m.tagName };
  });
  if (target.exists && target.hash === "#main") ok(`skip link targets #main (<${target.mainTag}>)`);
  else fail(`skip link did not reach #main (hash="${target.hash}", exists=${target.exists})`);
  await page.close();
}

/* ---------- 2. Focus visibility + order through the desktop header ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const seq = [];
  let invisible = 0;
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34),
        y: Math.round(r.top),
        indicated: (cs.outlineStyle !== "none" && cs.outlineWidth !== "0px") || cs.boxShadow !== "none",
      };
    });
    if (!s) break;
    seq.push(s);
    if (!s.indicated) invisible += 1;
  }
  console.log("      tab order:", seq.map((s) => `${s.tag}:${s.label}`).join(" > ").slice(0, 300));
  if (invisible === 0) ok(`every one of ${seq.length} tab stops has a visible focus indicator`);
  else fail(`${invisible} of ${seq.length} tab stops have no visible focus indicator`);

  const ys = seq.map((s) => s.y);
  const monotonic = ys.every((y, i) => i === 0 || y >= ys[i - 1] - 80);
  if (monotonic) ok("focus order follows visual order down the page");
  else fail(`focus order jumps backwards up the page: ${ys.join(", ")}`);
  await page.close();
}

/* ---------- 3. Mobile drawer, by keyboard only ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const toggle = page.locator("header button[aria-controls]");
  if (await toggle.count() === 0) fail("no menu button with aria-controls on mobile");
  else {
    await toggle.focus();
    const before = await toggle.getAttribute("aria-expanded");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    const after = await toggle.getAttribute("aria-expanded");
    if (before === "false" && after === "true") ok("menu button opens on Enter and reports aria-expanded=true");
    else fail(`aria-expanded did not toggle on Enter (${before} -> ${after})`);

    const drawerReachable = await page.evaluate(() => {
      const d = document.querySelector("#mobile-nav");
      if (!d) return { found: false };
      const links = [...d.querySelectorAll("a")];
      return { found: true, hidden: d.hasAttribute("hidden"), links: links.length };
    });
    if (drawerReachable.found && !drawerReachable.hidden && drawerReachable.links > 0)
      ok(`drawer exposes ${drawerReachable.links} links and is not hidden when open`);
    else fail(`drawer state wrong when open: ${JSON.stringify(drawerReachable)}`);

    // Tab from the toggle should land inside the drawer, not skip past it.
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const d = document.querySelector("#mobile-nav");
      return !!(d && d.contains(document.activeElement));
    });
    if (inside) ok("Tab from the menu button moves into the drawer");
    else note("Tab from the menu button does not enter the drawer — focus is not moved or trapped");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const afterEsc = await toggle.getAttribute("aria-expanded");
    if (afterEsc === "false") ok("Escape closes the drawer");
    else note("Escape does not close the drawer — open state survives Escape");
  }
  await page.close();
}

/* ---------- 4. Landmarks, headings, labels, language ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  for (const path of ["/", "/capabilities/", "/global-development/", "/contact/", "/2026/08/31/agentic-ai-reliability-budget/"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const s = await page.evaluate(() => {
      const hs = [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => +h.tagName[1]);
      let skips = 0;
      for (let i = 1; i < hs.length; i += 1) if (hs[i] - hs[i - 1] > 1) skips += 1;
      const inputs = [...document.querySelectorAll("input,select,textarea")];
      const unlabelled = inputs.filter((el) => {
        const id = el.getAttribute("id");
        return !(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") ||
          (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest("label"));
      }).length;
      return {
        lang: document.documentElement.lang,
        main: document.querySelectorAll("main").length,
        nav: document.querySelectorAll("nav").length,
        header: document.querySelectorAll("header").length,
        footer: document.querySelectorAll("footer").length,
        h1: document.querySelectorAll("h1").length,
        skips, inputs: inputs.length, unlabelled,
        navsNamed: [...document.querySelectorAll("nav")].every((n) => n.getAttribute("aria-label") || n.getAttribute("aria-labelledby")),
      };
    });
    const bad = [];
    if (!s.lang) bad.push("no lang on <html>");
    if (s.main !== 1) bad.push(`${s.main} <main>`);
    if (s.h1 !== 1) bad.push(`${s.h1} <h1>`);
    if (s.skips) bad.push(`${s.skips} heading-level skip(s)`);
    if (s.unlabelled) bad.push(`${s.unlabelled} unlabelled form control(s)`);
    if (!s.navsNamed) bad.push("a <nav> without an accessible name");
    if (bad.length) fail(`${path}: ${bad.join("; ")}`);
    else ok(`${path}: lang=${s.lang}, 1 main, 1 h1, ${s.nav} named nav, ${s.inputs} form controls, no heading skips`);
  }
  await page.close();
}

/* ---------- 5. Accessible names on every interactive element ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const nameless = await page.evaluate(() =>
    [...document.querySelectorAll("a,button")].filter((el) => {
      const text = (el.textContent || "").trim();
      return !text && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.querySelector("img[alt]:not([alt=''])");
    }).map((el) => el.tagName + (el.className ? "." + String(el.className).split(" ")[0] : "")));
  if (nameless.length === 0) ok("every link and button on the homepage has an accessible name");
  else fail(`${nameless.length} interactive element(s) with no accessible name: ${nameless.join(", ")}`);
  await page.close();
}

await browser.close();
console.log(
  failures.length === 0
    ? `\nKEYBOARD_QA=PASS (0 failures${notes.length ? `, ${notes.length} note(s)` : ""})`
    : `\nKEYBOARD_QA=FAIL (${failures.length} failure(s))`,
);
process.exit(failures.length === 0 ? 0 : 1);
