// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyRazorpaySignature, amountDuePaise, validateRefund } from './payment-core.ts';

describe('verifyRazorpaySignature', () => {
  const secret = 'test_secret';
  const good = createHmac('sha256', secret).update('order_1|pay_1').digest('hex');
  it('accepts the correct HMAC', async () => expect(await verifyRazorpaySignature('order_1', 'pay_1', good, secret)).toBe(true));
  it('rejects a tampered payment id', async () => expect(await verifyRazorpaySignature('order_1', 'pay_2', good, secret)).toBe(false));
  it('rejects garbage', async () => expect(await verifyRazorpaySignature('order_1', 'pay_1', 'abc', secret)).toBe(false));
});

describe('amountDuePaise', () => {
  it('prepaid charges the total', () => expect(amountDuePaise({ payment_method: 'RAZORPAY', total: '1078.00', cod_advance_amount: 0 })).toBe(107800));
  it('COD charges the advance', () => expect(amountDuePaise({ payment_method: 'COD', total: 1234.5, cod_advance_amount: '246.90' })).toBe(24690));
});

describe('validateRefund', () => {
  it('converts to paise', () => expect(validateRefund(100.5, 20000)).toEqual({ paise: 10050 }));
  it('rejects below ₹1', () => expect(validateRefund(0.5, 20000)).toHaveProperty('error'));
  it('rejects above refundable', () => expect(validateRefund(250, 20000)).toEqual({ error: 'Maximum refundable is ₹200.00' }));
});
