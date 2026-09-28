import { describe, it, expect } from 'vitest';
import { codAdvanceAmount, isCodAllowed, paymentLabel, readFunctionError } from './payment';

describe('codAdvanceAmount', () => {
  it('is pct of total rounded to paise', () => {
    expect(codAdvanceAmount(1234.5, 20)).toBe(246.9);
    expect(codAdvanceAmount(999, 33)).toBe(329.67);
  });
  it('is 0 when pct is 0 or invalid', () => {
    expect(codAdvanceAmount(1000, 0)).toBe(0);
    expect(codAdvanceAmount(1000, NaN)).toBe(0);
  });
});

describe('isCodAllowed', () => {
  it('allows everything when min is 0', () => expect(isCodAllowed(10, 0)).toBe(true));
  it('blocks totals below the minimum', () => {
    expect(isCodAllowed(499, 500)).toBe(false);
    expect(isCodAllowed(500, 500)).toBe(true);
  });
});

describe('paymentLabel', () => {
  const base = { total: 1000, cod_advance_amount: 200, cod_advance_paid: false };
  it('prepaid states', () => {
    expect(paymentLabel({ ...base, payment_method: 'RAZORPAY', payment_status: 'PAID' })).toBe('Paid');
    expect(paymentLabel({ ...base, payment_method: 'RAZORPAY', payment_status: 'PENDING' })).toBe('Awaiting payment');
    expect(paymentLabel({ ...base, payment_method: 'RAZORPAY', payment_status: 'FAILED' })).toBe('Payment failed');
  });
  it('COD states', () => {
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'PENDING' })).toBe('Awaiting advance');
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'PENDING', cod_advance_paid: true }))
      .toMatch(/^Advance .*200 paid · .*800 due on delivery$/);
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'PAID', cod_advance_paid: true })).toBe('Paid in full');
  });
  it('refunded wins', () => {
    expect(paymentLabel({ ...base, payment_method: 'COD', payment_status: 'REFUNDED' })).toBe('Refunded');
  });
});

describe('readFunctionError', () => {
  it('reads the JSON error body of a FunctionsHttpError', async () => {
    const e = { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify({ error: 'Invalid signature' })) };
    expect(await readFunctionError(e)).toBe('Invalid signature');
  });
  it('falls back to message', async () => {
    expect(await readFunctionError(new Error('boom'))).toBe('boom');
  });
});
