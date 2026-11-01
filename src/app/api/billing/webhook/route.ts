import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, status: "webhook_ready", provider: "paycell" });
}

export async function POST(request: Request) {
  try {
    let payload: Record<string, unknown> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
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

    console.log("[Paycell Webhook Received]:", JSON.stringify(payload));

    // Paycell expects an OK response to confirm callback delivery
    return NextResponse.json({ status: "success", received: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[Paycell Webhook Error]:", err);
    return NextResponse.json({ status: "error", message: "Failed to process webhook" }, { status: 400 });
  }
}
