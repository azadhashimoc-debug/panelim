import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/infrastructure/email/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Eksik parametrlər: to, subject və ya text/html tələb olunur.',
        },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      subject,
      text,
      html,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Server xətası baş verdi.',
      },
      { status: 500 }
    );
  }
}
