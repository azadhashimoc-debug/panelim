"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/shared/client/api";

export function LeaveRequestForm({
  onSuccess,
  demo = false,
}: {
  onSuccess: () => void;
  demo?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (demo) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        onSuccess();
        return;
      }
      await api("/api/leave-requests", {
        type: data.get("type"),
        startsOn: data.get("start"),
        endsOn: data.get("end"),
        reason: data.get("reason"),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Müraciət göndərilmədi.");
    } finally {
      setBusy(false);
    }
  }
  return <form className="stack" onSubmit={submit}>
    <p className="muted">Müraciət rəhbər təsdiqindən sonra qüvvəyə minir.</p>
    <label className="field">Müraciətin növü<select name="type" defaultValue="leave"><option value="leave">Məzuniyyət</option><option value="permission">İcazə</option></select></label>
    <div className="form-grid"><label className="field">Başlanğıc tarixi<input type="date" name="start" required /></label><label className="field">Bitiş tarixi<input type="date" name="end" required /></label></div>
    <label className="field">Səbəb<textarea name="reason" rows={3} minLength={3} maxLength={1000} required placeholder="Qısa səbəb yazın…" /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary full" disabled={busy}><Send size={17} />{busy ? "Göndərilir…" : "Müraciəti göndər"}</button>
  </form>;
}
