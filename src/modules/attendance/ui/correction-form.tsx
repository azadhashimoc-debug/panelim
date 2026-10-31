"use client";
import { tr } from "@/shared/i18n/catalog";
import { useState } from "react";
import { Send, Info } from "lucide-react";
import type { Workspace } from "@/shared/types";
import { api } from "@/shared/client/api";
import { date, time } from "@/shared/i18n/az";
export function CorrectionForm({
  workspace,
  onSuccess,
  demo = false,
}: {
  workspace: Workspace;
  onSuccess: () => void;
  demo?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [branch, setBranch] = useState(workspace.branches[0]?.id || ""),
    [record, setRecord] = useState("");
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const convert = (value: FormDataEntryValue | null) =>
      value ? new Date(`${value}:00+04:00`).toISOString() : null;
    try {
      if (demo) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        onSuccess();
        return;
      }
      await api("/api/corrections", {
        branchId: branch,
        attendanceId: record || null,
        requestedIn: convert(data.get("start")),
        requestedOut: convert(data.get("end")),
        reason: data.get("reason"),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Müraciət göndərilmədi."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack">
      <p className="muted">
        {tr(
          "Unudulmuş və ya səhv qeydi rəhbərinizə bildirin. Dəyişiklik yalnız təsdiqdən sonra qüvvəyə minir.",
        )}
      </p>
      <label className="field">
        {tr("Filial")}
        <select
          value={branch}
          required
          onChange={(e) => {
            setBranch(e.target.value);
            setRecord("");
          }}
        >
          {workspace.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {tr("Düzəldiləcək qeyd")}
        <select value={record} onChange={(e) => setRecord(e.target.value)}>
          <option value="">{tr("Unudulmuş giriş — yeni qeyd")}</option>
          {workspace.attendance
            .filter((a) => a.branch_id === branch)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {date(a.check_in)} {tr("·")}
                {time(a.check_in)}
              </option>
            ))}
        </select>
      </label>
      <div className="form-grid">
        <label className="field">
          {tr("Düzgün giriş vaxtı")}
          <input type="datetime-local" name="start" required />
        </label>
        <label className="field">
          {tr("Düzgün çıxış vaxtı")}
          <input type="datetime-local" name="end" />
        </label>
      </div>
      <p className="field-hint">
        <Info size={14} />{" "}
        {tr("Saatlar Bakı vaxtı ilədir. İş davam edirsə, çıxışı boş saxlayın.")}
      </p>
      <label className="field">
        {tr("Səbəb")}
        <textarea
          name="reason"
          rows={3}
          required
          minLength={3}
          maxLength={1000}
          placeholder={tr("Nə baş verdiyini qısa izah edin…")}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy || !branch}>
        <Send size={17} />
        {busy ? tr("Göndərilir…") : tr("Müraciəti göndər")}
      </button>
    </form>
  );
}
