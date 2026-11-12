import type { Role } from "./auth.js";
import { can } from "./auth.js";

// Workflow transition rules extracted from legacy program separation (see migration/process_summary.md).
// A transition is allowed only from the listed states AND with the listed permission.

export const TENDER_STAGES = ["draft", "booklet", "published", "bids_open", "bids_closed",
  "exclusion_review", "envelope_committee", "financial_evaluation", "award_committee",
  "negotiation", "awarded", "contracted"] as const;
export type TenderStage = typeof TENDER_STAGES[number];
const TENDER_NEXT: Partial<Record<TenderStage, TenderStage>> = {
  draft: "booklet", booklet: "published", published: "bids_open", bids_open: "bids_closed",
  bids_closed: "exclusion_review", exclusion_review: "envelope_committee",
  envelope_committee: "financial_evaluation", financial_evaluation: "award_committee",
  award_committee: "negotiation", negotiation: "awarded", awarded: "contracted",
};
const TENDER_STAGE_PERMISSION: Partial<Record<TenderStage, string>> = {
  bids_open: "bids.register", exclusion_review: "bids.register",
  envelope_committee: "tenders.write", financial_evaluation: "tenders.write",
  award_committee: "tenders.write", awarded: "tenders.write",
};
export function tenderTransition(from: TenderStage, to: TenderStage, role: Role): void {
  if (TENDER_NEXT[from] !== to) throw new Error(`tender cannot move ${from} -> ${to}; mandatory stages cannot be skipped`);
  const perm = TENDER_STAGE_PERMISSION[to];
  if (perm && !can(role, perm) && !can(role, "*")) throw new Error(`role ${role} lacks ${perm} for stage ${to}`);
}

// Expropriation (REMV01 -> REMV02): decree-dependent actions are prohibited before the
// ministerial/Council-of-Ministers decree is recorded. This is a hard gate, as in the legacy split.
export interface ExpropriationCase { stage: "pre_decree" | "post_decree"; decreeNo?: string; decreeDate?: string; gazetteNo?: string }
export function recordDecree(c: ExpropriationCase, decreeNo: string, decreeDate: string, gazetteNo: string): ExpropriationCase {
  if (!decreeNo || !decreeDate || !gazetteNo) throw new Error("decree number, decree date and Gazette reference are all required");
  return { ...c, stage: "post_decree", decreeNo, decreeDate, gazetteNo };
}
export function expropriationAction(c: ExpropriationCase, action: "display_lists" | "sale_forms" | "final_compensation" | "works_cheques"): void {
  if (action !== "works_cheques" && c.stage !== "post_decree")
    throw new Error(`action ${action} is prohibited before the decree is recorded (legacy REMV02 gate)`);
}

// Certificates: certification, billing and payment are separate processes (INV* -> BIL* -> PAG*).
// 'paid' may only be set by a payment record, never by editing the certificate status directly.
export type CertStatus = "draft" | "certified" | "billed" | "payment_authorized" | "paid";
export function certTransition(from: CertStatus, to: CertStatus, role: Role, opts?: { paymentRef?: string }): void {
  const order: CertStatus[] = ["draft", "certified", "billed", "payment_authorized", "paid"];
  if (order.indexOf(to) !== order.indexOf(from) + 1) throw new Error(`certificate cannot move ${from} -> ${to}`);
  if (to === "certified" && !can(role, "certificates.certify")) throw new Error("certification requires the technical role");
  if (to === "payment_authorized" && !can(role, "payment.authorize")) throw new Error("payment authorization requires the budget role (separation of duties: certifier cannot authorize payment)");
  if (to === "paid" && !opts?.paymentRef) throw new Error("a certificate becomes 'paid' only with a payment reference from the payment process — status edits cannot create payments");
}

// CHK5DAYS (Purchases, called by #BY054AR): legacy source not delivered (Blocker B-04).
// Implemented rule: deadline = start + 5 working days, working days = Sun–Thu (Egyptian government
// week at the time of the legacy system) excluding supplied holidays. FLAGGED: requires customer
// confirmation of the working-day calendar before equivalence can be claimed.
export function addWorkingDays(start: Date, days: number, holidays: Set<string> = new Set()): Date {
  const d = new Date(start); let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay(); // 0 Sun .. 6 Sat; Egypt gov weekend Fri(5)/Sat(6)
    const iso = d.toISOString().slice(0, 10);
    if (dow !== 5 && dow !== 6 && !holidays.has(iso)) added++;
  }
  return d;
}

// Estimates: legacy keeps draft (ADM*) physically separate from reviewed (ADMR*).
// Modern equivalent: one table, status-enforced separation + revision snapshots.
// draft -> reviewed requires estimates.review; reviewed -> approved requires
// estimates.approve (a different permission: reviewer and approver are separated).
// Returning a reviewed estimate reopens it as a NEW revision in draft.
export type EstimateStatus = "draft" | "reviewed" | "approved";
export function estimateTransition(from: EstimateStatus, to: EstimateStatus, role: Role): void {
  if (from === "draft" && to === "reviewed") {
    if (!can(role, "estimates.review")) throw new Error("estimate review requires the estimates.review permission");
    return;
  }
  if (from === "reviewed" && to === "approved") {
    if (!can(role, "estimates.approve")) throw new Error("estimate approval requires the estimates.approve permission (separate from review)");
    return;
  }
  if (from === "reviewed" && to === "draft") return; // returned for correction -> new revision
  throw new Error(`estimate cannot move ${from} -> ${to}`);
}
