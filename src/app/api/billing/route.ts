import { NextResponse } from "next/server";
import { fetchSubscriptionStatus, processSandboxCheckout } from "@/modules/organization/server/billing";

export async function GET() {
  try {
    const status = await fetchSubscriptionStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await processSandboxCheckout(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
