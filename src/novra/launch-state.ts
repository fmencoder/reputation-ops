/**
 * Launch gate state machine.
 *
 * Public launch is the one irreversible action in this project: once a page is
 * indexed it cannot be un-indexed on demand, and the whole point of the
 * exercise is that what gets indexed is accurate. So launch is gated on facts,
 * each of which is either machine-verified or explicitly set by a human, and
 * the file records which is which.
 *
 * Contains no secrets and is committed, so the gate state is reviewable in a
 * diff rather than living in someone's memory.
 */

export const MACHINE_GATES = [
  "CSS_INSTALLED",
  "T0_CAPTURED",
  "MEDIA_SYNC_COMPLETE",
  "CORE_PAGES_DEPLOYED",
  "FINAL_QA_PASS",
] as const;

export const HUMAN_GATES = ["CONTACT_EMAIL_CONFIRMED", "HUMAN_LAUNCH_APPROVAL"] as const;

export type MachineGate = (typeof MACHINE_GATES)[number];
export type HumanGate = (typeof HUMAN_GATES)[number];
export type Gate = MachineGate | HumanGate;

export const REQUIRED_GATES: readonly Gate[] = [...HUMAN_GATES, ...MACHINE_GATES];

export interface GateRecord {
  readonly value: boolean;
  /** Who or what last set it. Automation may only ever write "automation". */
  readonly setBy: "automation" | "human";
  readonly updatedAt: string;
  readonly evidence: string;
}

export interface LaunchState {
  readonly siteVisibility: "COMING_SOON" | "PUBLIC";
  readonly gates: Record<Gate, GateRecord>;
  readonly notes?: readonly string[];
}

export function emptyGate(evidence: string): GateRecord {
  return { value: false, setBy: "automation", updatedAt: new Date(0).toISOString(), evidence };
}

/**
 * HUMAN_LAUNCH_APPROVAL is not something automation can conclude. Not from a
 * clean CI run, not from every other gate passing, and not from an instruction
 * in a prompt that asked for automation to be built — building the mechanism is
 * not the same as authorising its use.
 *
 * This function is the enforcement point: it drops any attempt by automation to
 * raise a human gate, and returns what it refused so the caller reports it
 * rather than silently continuing.
 */
export function applyAutomationUpdates(
  current: LaunchState,
  updates: Partial<Record<Gate, { value: boolean; evidence: string }>>,
  now: () => Date = () => new Date(),
): { next: LaunchState; refused: readonly Gate[] } {
  const gates: Record<Gate, GateRecord> = { ...current.gates };
  const refused: Gate[] = [];

  for (const [key, update] of Object.entries(updates) as [Gate, { value: boolean; evidence: string }][]) {
    if ((HUMAN_GATES as readonly string[]).includes(key) && update.value) {
      refused.push(key);
      continue;
    }
    gates[key] = {
      value: update.value,
      setBy: "automation",
      updatedAt: now().toISOString(),
      evidence: update.evidence,
    };
  }

  return { next: { ...current, gates }, refused };
}

export interface GateEvaluation {
  readonly ready: boolean;
  readonly open: readonly Gate[];
  readonly closed: readonly Gate[];
}

export function evaluateGates(state: LaunchState): GateEvaluation {
  const open: Gate[] = [];
  const closed: Gate[] = [];
  for (const gate of REQUIRED_GATES) {
    if (state.gates[gate]?.value) closed.push(gate);
    else open.push(gate);
  }
  return { ready: open.length === 0, open, closed };
}

/**
 * The only function permitted to conclude that a launch may proceed.
 *
 * Requires every gate closed AND the human approval gate to have been set by a
 * human. A HUMAN_LAUNCH_APPROVAL that automation somehow wrote does not count,
 * which is the difference between a gate and a formality.
 */
export function mayLaunch(state: LaunchState): { allowed: boolean; reasons: readonly string[] } {
  const reasons: string[] = [];
  const evaluation = evaluateGates(state);

  for (const gate of evaluation.open) reasons.push(`${gate} is not closed`);

  const approval = state.gates.HUMAN_LAUNCH_APPROVAL;
  if (approval?.value && approval.setBy !== "human") {
    reasons.push("HUMAN_LAUNCH_APPROVAL was set by automation, which does not count as approval");
  }

  const email = state.gates.CONTACT_EMAIL_CONFIRMED;
  if (email?.value && email.setBy !== "human") {
    reasons.push("CONTACT_EMAIL_CONFIRMED was set by automation; the address must be confirmed by a person");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function initialState(now: () => Date = () => new Date()): LaunchState {
  const stamp = now().toISOString();
  const gates = {} as Record<Gate, GateRecord>;
  for (const gate of REQUIRED_GATES) {
    gates[gate] = {
      value: false,
      setBy: (HUMAN_GATES as readonly string[]).includes(gate) ? "human" : "automation",
      updatedAt: stamp,
      evidence: "not yet established",
    };
  }
  return { siteVisibility: "COMING_SOON", gates };
}

export function parseLaunchState(raw: string): LaunchState {
  const parsed = JSON.parse(raw) as Partial<LaunchState>;
  const base = initialState();
  const gates: Record<Gate, GateRecord> = { ...base.gates };
  for (const gate of REQUIRED_GATES) {
    const record = parsed.gates?.[gate];
    if (record && typeof record.value === "boolean") {
      gates[gate] = {
        value: record.value,
        setBy: record.setBy === "human" ? "human" : "automation",
        updatedAt: record.updatedAt ?? base.gates[gate].updatedAt,
        evidence: record.evidence ?? "",
      };
    }
  }
  return {
    siteVisibility: parsed.siteVisibility === "PUBLIC" ? "PUBLIC" : "COMING_SOON",
    gates,
    ...(parsed.notes ? { notes: parsed.notes } : {}),
  };
}

export function serializeLaunchState(state: LaunchState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}
