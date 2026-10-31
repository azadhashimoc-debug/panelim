"use client";
import { tr } from "@/shared/i18n/catalog";
import { useEffect, useRef, useState } from "react";
import { Camera, QrCode } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
function tokenFrom(text: string) {
  try {
    return new URL(text).searchParams.get("qr") || text;
  } catch {
    return text;
  }
}
export function QrScanner({ onToken }: { onToken: (token: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const [scanning, setScanning] = useState(false),
    [error, setError] = useState(""),
    [manual, setManual] = useState("");
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    import("@zxing/browser")
      .then(async ({ BrowserQRCodeReader }) => {
        const reader = new BrowserQRCodeReader();
        const active = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" }, audio: false },
          video.current!,
          (result, _, activeControls) => {
            if (result && !cancelled) {
              activeControls.stop();
              setScanning(false);
              onToken(tokenFrom(result.getText()));
            }
          },
        );
        if (cancelled) active.stop();
        else controls.current = active;
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            tr(
              "Kameranı açmaq mümkün olmadı. İcazəni yoxlayın və ya QR keçidini daxil edin.",
            ),
          );
          setScanning(false);
        }
      });
    return () => {
      cancelled = true;
      controls.current?.stop();
    };
  }, [scanning, onToken]);
  return (
    <div className="scanner">
      {scanning ? (
        <video
          ref={video}
          className="camera-preview"
          muted
          playsInline
          aria-label={tr("QR kamera görüntüsü")}
        />
      ) : (
        <div className="scan-frame">
          <QrCode size={72} strokeWidth={1.1} />
          <span>{tr("Filialdakı QR kodu oxudun")}</span>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary full"
        type="button"
        onClick={() => {
          setError("");
          setScanning((s) => !s);
        }}
      >
        <Camera size={18} />
        {scanning ? tr("Kameranı dayandır") : tr("Kameranı aç")}
      </button>
      <details>
        <summary>{tr("QR keçidini əl ilə daxil et")}</summary>
        <label className="field">
          {tr("QR keçidi və ya kod")}
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            maxLength={2048}
            placeholder={tr("Filialın QR keçidi")}
          />
        </label>
        <button
          className="button secondary full"
          disabled={!manual.trim()}
          onClick={() => onToken(tokenFrom(manual.trim()))}
        >
          {tr("Kodu istifadə et")}
        </button>
      </details>
    </div>
  );
}
