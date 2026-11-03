import { NextResponse } from "next/server";
import { serviceClient } from "@/infrastructure/supabase/server";
import { verifyPaycellOrderId } from "@/modules/organization/server/billing";

async function activatePaycellOrder(orderId: string): Promise<boolean> {
  const verified = verifyPaycellOrderId(orderId);
  if (!verified) {
    console.warn(`[Paycell Webhook] Rejected invalid/unverified order_id: ${orderId}`);
    return false;
  }

  const { companyId, plan, extraBranches } = verified;
  const db = serviceClient();
  const amount =
    plan === "start"
      ? 1500 + extraBranches * 500
      : plan === "business"
        ? 2900 + extraBranches * 500
        : 4900;

  const { data: owner } = await db
    .from("memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .is("archived_at", null)
    .order("id")
    .limit(1)
    .maybeSingle();

  if (!owner) {
    console.warn(`[Paycell Webhook] Owner not found for company ${companyId}`);
    return false;
  }

  const { error } = await db.rpc("process_subscription_payment", {
    p_actor: owner.user_id,
    p_company_id: companyId,
    p_plan: plan,
    p_amount_qepik: amount,
    p_extra_branches: extraBranches,
    p_idempotency_key: `paycell-${orderId}`.slice(0, 100),
    p_provider_tx_id: orderId,
  });

  if (error) {
    console.error("[Paycell Webhook RPC Error]:", error.message);
    return false;
  }

  return true;
}

function resolveCallbackUrl(rawCallback: string | null, requestUrl: string): string | null {
  if (!rawCallback) return null;
  const candidates = [rawCallback];
  try {
    candidates.push(Buffer.from(rawCallback, "base64").toString("utf-8"));
  } catch {
    // ignore decode error
  }
  const reqOrigin = new URL(requestUrl).origin;
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (
        parsed.origin === "https://panelim.az" ||
        parsed.origin === "https://www.panelim.az" ||
        parsed.origin === reqOrigin
      ) {
        return parsed.toString();
      }
    } catch {
      // not a full URL
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("order_id");
    const callback = url.searchParams.get("callback");

    if (orderId) {
      const activated = await activatePaycellOrder(orderId);
      if (!activated) {
        return NextResponse.json(
          { ok: false, error: "Invalid or expired order_id" },
          { status: 403 },
        );
      }
    }

    const safeRedirect = resolveCallbackUrl(callback, request.url);
    if (safeRedirect) {
      return NextResponse.redirect(safeRedirect, 302);
    }

    if (orderId && (request.headers.get("accept") || "").includes("text/html")) {
      return NextResponse.redirect(new URL("/rehber?payment=success", request.url), 302);
    }

    return NextResponse.json({
      ok: true,
      status: "webhook_processed",
      provider: "paycell",
    });
  } catch (err: unknown) {
    console.error("[Paycell GET Webhook Error]:", err);
    return NextResponse.json(
      { ok: false, error: "Processing failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    let payload: Record<string, unknown> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else {
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    const orderId = String(payload.order_id || payload.orderId || "");
    if (orderId) {
      const activated = await activatePaycellOrder(orderId);
      if (!activated) {
        return NextResponse.json(
          { status: "error", message: "Invalid or expired order_id" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ status: "success", received: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[Paycell POST Webhook Error]:", err);
    return NextResponse.json(
      { status: "error", message: "Failed to process webhook" },
      { status: 400 },
    );
  }
}
