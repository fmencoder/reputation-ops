/**
 * Launch gate CLI.
 *
 * Reads site/launch-state.json and reports whether a public launch is
 * permitted. It never sets a human gate and it never changes visibility on its
 * own — `--execute` is what performs the visibility change, and it refuses
 * unless every gate is closed *and* the human approval was recorded by a human.
 *
 * Usage:
 *   npm run site:launch              report gate state (read-only)
 *   npm run site:launch -- --execute perform the launch, if permitted
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { evaluateGates, mayLaunch, parseLaunchState, REQUIRED_GATES } from "../novra/launch-state.js";

const ROOT = process.cwd();

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const state = parseLaunchState(await readFile(join(ROOT, "site", "launch-state.json"), "utf8"));
  const evaluation = evaluateGates(state);
  const verdict = mayLaunch(state);

  console.log(`SITE_VISIBILITY=${state.siteVisibility}`);
  for (const gate of REQUIRED_GATES) {
    const record = state.gates[gate];
    console.log(`${gate}=${record.value} (set by ${record.setBy}: ${record.evidence})`);
  }
  console.log(`\nGATES_CLOSED=${evaluation.closed.length}/${REQUIRED_GATES.length}`);
  console.log(`READY_FOR_PUBLIC_LAUNCH=${verdict.allowed ? "YES" : "NO"}`);

  if (!verdict.allowed) {
    console.log("\nBLOCKED BY:");
    for (const reason of verdict.reasons) console.log(`  ${reason}`);
    process.exit(execute ? 1 : 0);
  }

  if (!execute) {
    console.log("\nEvery gate is closed. Re-run with --execute to change visibility.");
    return;
  }

  // Reaching here requires a human to have written HUMAN_LAUNCH_APPROVAL into
  // the committed state file. Automation cannot produce that record: see
  // applyAutomationUpdates, which drops any attempt to raise a human gate.
  const site = process.env["NOVRA_WP_SITE"];
  const token = process.env["NOVRA_WP_ACCESS_TOKEN"];
  if (!site || !token) {
    console.error("NOVRA_WP_SITE and NOVRA_WP_ACCESS_TOKEN are required to change visibility.");
    process.exit(2);
  }

  console.error(
    "\nSTOP. Visibility change is not automated in this implementation.\n" +
    "WordPress.com exposes Coming Soon / launch status through site-management\n" +
    "surfaces this deployer has not been able to exercise against a real site,\n" +
    "and an unverified write to a visibility setting is exactly the irreversible\n" +
    "action these gates exist to prevent.\n\n" +
    "Every gate above is closed. Perform the launch in wp-admin, then record it:\n" +
    "  Settings -> General -> Privacy -> Public\n" +
    "and set siteVisibility to PUBLIC in site/launch-state.json in the same commit.",
  );
  process.exit(3);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
