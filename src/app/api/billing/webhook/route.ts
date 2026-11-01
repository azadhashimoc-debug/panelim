import { NextResponse } from "next/server";
import { serviceClient } from "@/infrastructure/supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("order_id");
    const callback = url.searchParams.get("callback");

    if (orderId) {
      console.log(`[Paycell GET Webhook] Processing order: ${orderId}`);
      // Parse order metadata if encoded as sub_<companyId>_<plan>_<extraBranches>_<random>
      const parts = orderId.split("_");
      if (parts[0] === "sub" && parts.length >= 4) {
        const companyId = parts[1];
        const plan = parts[2];
        const extraBranches = parseInt(parts[3], 10) || 0;

        const db = serviceClient();
        const amount =
          plan === "start"
            ? 1500 + extraBranches * 500
            : plan === "business"
              ? 2900 + extraBranches * 500
              : 4900;

        // Fetch owner actor id
        const { data: owner } = await db
          .from("memberships")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("role", "owner")
          .is("archived_at", null)
          .order("id")
          .limit(1)
          .maybeSingle();

        if (owner) {
          await db.rpc("process_subscription_payment", {
            p_actor: owner.user_id,
            p_company_id: companyId,
            p_plan: plan,
            p_amount_qepik: amount,
            p_extra_branches: extraBranches,
            p_idempotency_key: `paycell-${orderId}`,
            p_provider_tx_id: orderId,
          });
        }
      }
    }

    if (callback) {
      try {
        const decoded = Buffer.from(callback, "base64").toString("utf-8");
        if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
          return NextResponse.redirect(decoded, 302);
        }
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({ ok: true, status: "webhook_processed", provider: "paycell" });
  } catch (err: unknown) {
    console.error("[Paycell GET Webhook Error]:", err);
    return NextResponse.json({ ok: false, error: "Processing failed" }, { status: 500 });
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

    console.log("[Paycell POST Webhook Received]:", JSON.stringify(payload));

    const orderId = String(payload.order_id || payload.orderId || "");
    if (orderId && orderId.startsWith("sub_")) {
      const parts = orderId.split("_");
      if (parts.length >= 4) {
        const companyId = parts[1];
        const plan = parts[2];
        const extraBranches = parseInt(parts[3], 10) || 0;

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

        if (owner) {
          await db.rpc("process_subscription_payment", {
            p_actor: owner.user_id,
            p_company_id: companyId,
            p_plan: plan,
            p_amount_qepik: amount,
            p_extra_branches: extraBranches,
            p_idempotency_key: `paycell-${orderId}`,
            p_provider_tx_id: orderId,
          });
        }
      }
    }

    return NextResponse.json({ status: "success", received: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[Paycell POST Webhook Error]:", err);
    return NextResponse.json({ status: "error", message: "Failed to process webhook" }, { status: 400 });
  }
}
