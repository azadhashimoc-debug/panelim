import { Check } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon" aria-hidden="true">
        <span />
        <span />
        <span />
        <Check size={19} strokeWidth={3} />
      </span>
      <span>
        panelim<span className="brand-domain">.az</span>
      </span>
    </span>
  );
}
