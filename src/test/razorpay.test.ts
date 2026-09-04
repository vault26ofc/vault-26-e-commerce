import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import createOrderHandler from '../../api/create-order';
import verifyPaymentHandler from '../../api/verify-payment';
import { loadRazorpayScript } from '../lib/razorpay';

describe('Razorpay Serverless Handlers', () => {
  const TEST_KEY_ID = 'rzp_test_TXztHZnONanpCN';
  const TEST_KEY_SECRET = 'KehS6U9nM5mKJH1wz67DT1ku';

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  });

  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader: vi.fn((k: string, v: string) => {
        res.headers[k] = v;
      }),
      status: vi.fn((code: number) => {
        res.statusCode = code;
        return res;
      }),
      json: vi.fn((data: any) => {
        res.body = data;
        return res;
      }),
      end: vi.fn(() => res),
    };
    return res;
  };

  describe('POST /api/create-order', () => {
    it('should reject non-POST requests', async () => {
      const req = { method: 'GET' };
      const res = createMockRes();

      await createOrderHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.body.error).toContain('Method not allowed');
    });

    it('should reject orders with amount < 100 paise', async () => {
      const req = {
        method: 'POST',
        body: { amount: 50 }, // 50 paise is < 100 paise
      };
      const res = createMockRes();

      await createOrderHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Minimum amount is 100 paise');
    });

    it('should successfully create an order with valid amount via Razorpay API', async () => {
      const req = {
        method: 'POST',
        body: { amount: 50000, receipt: 'rcpt_test_123' }, // ₹500
      };
      const res = createMockRes();

      await createOrderHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.order_id).toBeDefined();
      expect(res.body.amount).toBe(50000);
      expect(res.body.currency).toBe('INR');
      expect(res.body.key_id).toBe(TEST_KEY_ID);
    });
  });

  describe('POST /api/verify-payment', () => {
    it('should reject requests with missing fields', async () => {
      const req = {
        method: 'POST',
        body: { razorpay_order_id: 'order_123' }, // missing payment_id and signature
      };
      const res = createMockRes();

      await verifyPaymentHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('should return 400 when HMAC signature does not match', async () => {
      const req = {
        method: 'POST',
        body: {
          razorpay_order_id: 'order_test_999',
          razorpay_payment_id: 'pay_test_888',
          razorpay_signature: 'invalid_forged_signature_1234567890abcdef',
        },
      };
      const res = createMockRes();

      await verifyPaymentHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Signature mismatch');
    });

    it('should return 200 when HMAC signature is valid', async () => {
      const orderId = 'order_test_valid_123';
      const paymentId = 'pay_test_valid_456';
      const validSignature = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const req = {
        method: 'POST',
        body: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        },
      };
      const res = createMockRes();

      await verifyPaymentHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Payment verified successfully');
    });
  });

  describe('Frontend Razorpay Script Loader', () => {
    it('should detect when window.Razorpay is already present', async () => {
      (window as any).Razorpay = class {};
      const loaded = await loadRazorpayScript();
      expect(loaded).toBe(true);
    });
  });
});
