import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, DEFAULT_FROM_EMAIL } from '@/infrastructure/email/resend';

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn().mockImplementation(async (payload) => {
          if (payload.to === 'fail@example.com') {
            return { data: null, error: { message: 'Domain verification failed' } };
          }
          return { data: { id: 'msg_12345' }, error: null };
        }),
      };
    },
  };
});

describe('Resend Email Service (panelim.az)', () => {
  const originalEnv = process.env.RESEND_API_KEY;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_mock_test_key';
  });

  it('xəta qaytarmalıdır əgər RESEND_API_KEY təyin olunmayıbsa', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Salam',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RESEND_API_KEY');
  });

  it('çatışmayan parametr olduqda xəta qaytarmalıdır', async () => {
    const result = await sendEmail({
      to: '',
      subject: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('standart göndərən olaraq "Panelim <noreply@panelim.az>" istifadə etməlidir və uğurla göndərməlidir', async () => {
    expect(DEFAULT_FROM_EMAIL).toBe('Panelim <noreply@panelim.az>');

    const result = await sendEmail({
      to: 'recipient@example.com',
      subject: 'Xoş gəldiniz',
      text: 'Panelim sisteminə xoş gəldiniz.',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'msg_12345' });
  });

  it('Resend tərəfindən xəta qaytarıldıqda düzgün idarə olunmalıdır', async () => {
    const result = await sendEmail({
      to: 'fail@example.com',
      subject: 'Xəta testi',
      text: 'Test mesajı',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Domain verification failed');
  });
});
