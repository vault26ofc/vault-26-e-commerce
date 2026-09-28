import { inr } from './format';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function codAdvanceAmount(total: number, pct: number): number {
  if (!(pct > 0) || !(total > 0)) return 0;
  return round2((total * pct) / 100);
}

export function isCodAllowed(total: number, minOrder: number): boolean {
  return !(minOrder > 0) || total >= minOrder;
}

export type PaymentView = {
  payment_method: string;
  payment_status: string;
  total: number | string;
  cod_advance_amount?: number | string | null;
  cod_advance_paid?: boolean | null;
};

export function paymentLabel(o: PaymentView): string {
  if (o.payment_status === 'REFUNDED') return 'Refunded';
  if (o.payment_method !== 'COD') {
    if (o.payment_status === 'PAID') return 'Paid';
    if (o.payment_status === 'FAILED') return 'Payment failed';
    return 'Awaiting payment';
  }
  if (o.payment_status === 'PAID') return 'Paid in full';
  if (!o.cod_advance_paid) return 'Awaiting advance';
  const advance = Number(o.cod_advance_amount) || 0;
  return `Advance ${inr(advance)} paid · ${inr(round2(Number(o.total) - advance))} due on delivery`;
}

/** supabase.functions.invoke() puts non-2xx bodies in error.context (a Response). */
export async function readFunctionError(e: unknown): Promise<string> {
  const ctx = (e as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    } catch { /* not JSON */ }
  }
  return (e as { message?: string })?.message || 'Something went wrong';
}
