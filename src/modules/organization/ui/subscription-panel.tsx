"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/shared/client/api";
import { Modal } from "@/shared/ui/modal";
import { subscriptionCopy as copy } from "@/shared/i18n/subscription";
import { PaycellCheckoutModal } from "./paycell-checkout-modal";
import type { FreeSelectionOptions, SubscriptionStatus } from "@/shared/types";

type Plan = SubscriptionStatus["plan_tier"];
const plans: Plan[] = ["free", "start", "business", "growth"];
const prices: Record<Plan, number> = { free: 0, start: 15, business: 29, growth: 49 };
const maximumExtras: Record<Plan, number> = { free: 0, start: 2, business: 1, growth: 0 };

const DEMO_SUBSCRIPTION_STATUS: SubscriptionStatus = {
  plan_tier: "business",
  effective_plan: "business",
  status: "trialing",
  days_left: 14,
  extra_branches: 0,
  active_employees: 8,
  max_employees: 25,
  active_branches: 2,
  max_branches: 2,
  is_limit_exceeded: false,
};

export function SubscriptionPanel({ demo = false }: { demo?: boolean }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(demo ? DEMO_SUBSCRIPTION_STATUS : null);
  const [options, setOptions] = useState<FreeSelectionOptions | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [plan, setPlan] = useState<Plan>("business");
  const [extras, setExtras] = useState(0);
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selectionKey = useRef<string | null>(null);
  const checkoutKey = useRef<string | null>(null);

  async function refresh(signal?: AbortSignal) {
    if (demo) {
      setStatus(DEMO_SUBSCRIPTION_STATUS);
      return;
    }
    const result = await api<{ status: SubscriptionStatus }>("/api/billing");
    if (signal?.aborted) return;
    setStatus(result.status);
    if (result.status.effective_plan === "free" && result.status.is_limit_exceeded) {
      const choices = await api<FreeSelectionOptions>("/api/billing/selection");
      if (signal?.aborted) return;
      setStatus(choices.status);
      setOptions(choices);
      setMembers([choices.ownerMembershipId]);
      setBranch("");
      selectionKey.current = null;
    } else setOptions(null);
  }

  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    api<{ status: SubscriptionStatus }>("/api/billing", undefined, controller.signal)
      .then(async (result) => {
        if (controller.signal.aborted) return;
        setStatus(result.status);
        if (result.status.effective_plan === "free" && result.status.is_limit_exceeded) {
          const choices = await api<FreeSelectionOptions>("/api/billing/selection", undefined, controller.signal);
          if (controller.signal.aborted) return;
          setStatus(choices.status);
          setOptions(choices);
          setMembers([choices.ownerMembershipId]);
          setBranch("");
          selectionKey.current = null;
        } else {
          setOptions(null);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [demo]);

  async function retry() {
    setLoading(true); setError("");
    try { await refresh(); }
    catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }

  async function checkout(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    checkoutKey.current ??= crypto.randomUUID();
    try {
      await api("/api/billing", { plan, extraBranches: extras, idempotencyKey: checkoutKey.current });
      checkoutKey.current = null;
      setMessage(plan === "free" ? copy.freeSaved : copy.paidSaved);
      setConfirm(false);
      await refresh();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function completeSelection(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    selectionKey.current ??= crypto.randomUUID();
    try {
      await api("/api/billing/selection", { memberIds: members, branchId: branch, idempotencyKey: selectionKey.current });
      selectionKey.current = null;
      setMessage(copy.selectionSaved);
      setOptions(null);
      await refresh();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  return <section aria-label={copy.title} className="subscription-panel">
    {loading && <p role="status">{copy.loading}</p>}
    {error && <div role="alert" className="subscription-error"><p>{error}</p><button type="button" className="button secondary compact" disabled={busy || loading} onClick={retry}>{copy.retry}</button> <Link href="/giris">{copy.login}</Link></div>}
    {message && <p role="status" className="subscription-success">{message}</p>}
    {status && <>
      <section className="hub-data-panel">
        <h2>{copy.current}: {status.effective_plan.toUpperCase()}</h2>
        <p>{status.status === "trialing" ? `${copy.trial} · ${status.days_left} ${copy.remaining}` : status.effective_plan === "free" ? copy.free : `${copy.active} · ${status.days_left} ${copy.remaining}`}</p>
        <div className="hub-pay-summary"><div><strong>{status.active_employees} / {status.max_employees} {copy.employees}</strong><span>{copy.total}</span></div><div><strong>{status.active_branches} / {status.max_branches} {copy.branches}</strong></div></div>
      </section>
      {status.is_limit_exceeded && <p className="subscription-warning">{status.effective_plan === "free" ? copy.limitNotice : copy.upgradeNotice}</p>}
      {options && status.effective_plan === "free" && status.is_limit_exceeded && <section className="hub-data-panel">
        <h2>{copy.selectTitle}</h2><p>{copy.history}</p>
        <form onSubmit={completeSelection}>
          <fieldset disabled={busy}><legend>{copy.staff} ({members.length} / 3)</legend>
            <p>{copy.ownerHelp}</p>
            {options.members.map(member => <label className="subscription-choice" key={member.id}>
              <input type="checkbox" checked={members.includes(member.id)} disabled={member.id === options.ownerMembershipId || (!members.includes(member.id) && members.length >= 3)} onChange={event => {
                selectionKey.current = null;
                setMembers(current => event.target.checked ? [...current, member.id] : current.filter(id => id !== member.id));
              }}/><span>{member.display_name}{member.id === options.ownerMembershipId ? ` (${copy.owner})` : ""}</span>
            </label>)}
          </fieldset>
          <fieldset disabled={busy}><legend>{copy.branch}</legend>
            {options.branches.map(item => <label className="subscription-choice" key={item.id}><input type="radio" name="retained-branch" value={item.id} checked={branch === item.id} onChange={() => { selectionKey.current = null; setBranch(item.id); }}/><span>{item.name}</span></label>)}
          </fieldset>
          <button type="submit" className="button primary" disabled={busy || !branch || members.length === 0 || members.length > 3}>{busy ? copy.busy : copy.confirmSelection}</button>
        </form>
      </section>}
      <section className="hub-data-panel">
        <h2>{copy.chooseTitle}</h2>
        <div className="subscription-controls">
          <label>{copy.plan}<select value={plan} disabled={busy} onChange={event => { setPlan(event.target.value as Plan); setExtras(0); checkoutKey.current = null; }}>{plans.map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label>
          {maximumExtras[plan] > 0 && <label>{copy.extraBranches}<select value={extras} disabled={busy} onChange={event => { setExtras(Number(event.target.value)); checkoutKey.current = null; }}>{Array.from({ length: maximumExtras[plan] + 1 }, (_, i) => <option value={i} key={i}>{i}</option>)}</select></label>}
        </div>
        <p>{copy.price}: <strong>{prices[plan] + extras * 5} AZN</strong></p>
        <p>{copy.sandbox}</p>
        <button type="button" className="button primary" disabled={busy || loading} onClick={() => { setError(""); setMessage(""); setConfirm(true); }}>{copy.choose}</button>
      </section>
    </>}
    {confirm && plan === "free" && (
      <Modal title={copy.chooseTitle} onClose={() => { if (!busy) setConfirm(false); }}>
        <form onSubmit={checkout}>
          <p>{copy.freeConfirmation}</p>
          {error && <p role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>
              {copy.cancel}
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? copy.busy : copy.confirm}
            </button>
          </div>
        </form>
      </Modal>
    )}
    {confirm && plan !== "free" && (
      <PaycellCheckoutModal
        plan={plan}
        extraBranches={extras}
        amountAzn={prices[plan] + extras * 5}
        onSuccess={async () => {
          await refresh();
        }}
        onClose={() => {
          setConfirm(false);
        }}
      />
    )}
  </section>;
}
