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

import { confirmFailure, refundOutcome } from './payment-core.ts';

describe('confirmFailure', () => {
  it('out of stock → 409, record refund on order', () =>
    expect(confirmFailure('OUT_OF_STOCK')).toEqual({ status: 409, recordOnOrder: true, error: 'An item sold out while you were paying. Your payment has been refunded.' }));
  it('cancelled meanwhile → 409, record refund on order', () =>
    expect(confirmFailure('NOT_PENDING')).toMatchObject({ status: 409, recordOnOrder: true }));
  it('paid twice → 409, leave the order alone', () =>
    expect(confirmFailure('ALREADY_CONFIRMED')).toMatchObject({ status: 409, recordOnOrder: false }));
  it('unexpected DB error → 500, refunded', () =>
    expect(confirmFailure('connection reset')).toEqual({ status: 500, recordOnOrder: true, error: "We couldn't confirm your order, so your payment has been refunded. Please try again." }));
});

describe('refundOutcome', () => {
  it('processed full refund', () => expect(refundOutcome('processed', 1000, 1000)).toEqual({ refund_status: 'REFUNDED', paymentRefunded: true, failed: false }));
  it('processed partial refund', () => expect(refundOutcome('processed', 500, 1000)).toEqual({ refund_status: 'REFUNDED', paymentRefunded: false, failed: false }));
  it('pending', () => expect(refundOutcome('pending', 1000, 1000)).toEqual({ refund_status: 'PROCESSING', paymentRefunded: false, failed: false }));
  it('failed goes back to REQUESTED', () => expect(refundOutcome('failed', 1000, 1000)).toEqual({ refund_status: 'REQUESTED', paymentRefunded: false, failed: true }));
});

import { verifyWebhookSignature } from './payment-core.ts';

describe('verifyWebhookSignature', () => {
  const secret = 'whsec';
  const body = '{"event":"payment.captured"}';
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  it('accepts the raw-body HMAC', async () => expect(await verifyWebhookSignature(body, sig, secret)).toBe(true));
  it('rejects a modified body', async () => expect(await verifyWebhookSignature(body + ' ', sig, secret)).toBe(false));
  it('rejects a missing header', async () => expect(await verifyWebhookSignature(body, null, secret)).toBe(false));
});
