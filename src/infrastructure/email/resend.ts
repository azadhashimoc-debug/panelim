import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const DEFAULT_FROM_EMAIL = 'Panelim <noreply@panelim.az>';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  from = DEFAULT_FROM_EMAIL,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'RESEND_API_KEY mühit dəyişəni təyin edilməyib.',
      };
    }

    if (!to || !subject || (!text && !html)) {
      return {
        success: false,
        error: 'Qəbul edən (to), Mövzu (subject) və Məzmun (text və ya html) tələb olunur.',
      };
    }

    const client = resend || new Resend(process.env.RESEND_API_KEY);

    const payload: any = {
      from,
      to,
      subject,
    };

    if (text) payload.text = text;
    if (html) payload.html = html;

    const { data, error } = await client.emails.send(payload);

    if (error) {
      return {
        success: false,
        error: error.message || 'E-poçt göndərilərkən xəta baş verdi.',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'E-poçt servisi ilə əlaqə zamanı gözlənilməz xəta baş verdi.',
    };
  }
}
