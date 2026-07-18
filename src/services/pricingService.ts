import { CartLine, PriceBreakdown } from '../types';
import { productRepo } from '../repositories/productRepo';

const TAX_BPS = 700; // 7.00% expressed in basis points

export async function computeSubtotal(lines: CartLine[]): Promise<number> {
  let subtotal = 0;
  for (const line of lines) {
    if (line.quantity <= 0) throw new Error(`quantity must be positive for ${line.sku}`);
    const product = await productRepo.get(line.sku);
    if (!product) throw new Error(`unknown sku: ${line.sku}`);
    subtotal += product.priceCents * line.quantity;
  }
  return subtotal;
}

/** Tax on an amount of cents, rounded half-up. */
export function taxOf(amountCents: number): number {
  return Math.round((amountCents * TAX_BPS) / 10000);
}

/**
 * Turn a subtotal + discount into a full breakdown. Tax is charged on
 * (subtotal - discount); discount is clamped so it can never exceed the
 * subtotal. Pulled out of `priceCart` so callers that already have the
 * subtotal (e.g. to compute a coupon discount) don't pay for a second
 * `computeSubtotal` pass.
 */
export function priceFromSubtotal(subtotalCents: number, discountCents = 0): PriceBreakdown {
  const discount = Math.max(0, Math.min(discountCents, subtotalCents));
  const taxable = subtotalCents - discount;
  const taxCents = taxOf(taxable);
  return { subtotalCents, discountCents: discount, taxCents, totalCents: taxable + taxCents };
}

/**
 * Price a cart. `discountCents` is supplied by the caller (Dev track will
 * wire couponService in).
 */
export async function priceCart(lines: CartLine[], discountCents = 0): Promise<PriceBreakdown> {
  const subtotalCents = await computeSubtotal(lines);
  return priceFromSubtotal(subtotalCents, discountCents);
}
