// AI Tags sample file for diagnostics/hover validation.

type PriceInput = {
  subtotal: number;
  taxRate: number;
  currency: string;
};

// @AI:CONTEXT Pricing entry point for checkout flow.
// @AI:BOUNDARY Validate inputs only in this function.
// @AI:ASSUMPTION Currency is always ISO-4217.
export const calculatePrice = (input: PriceInput): number => {
  const { subtotal, taxRate } = input;
  const tax = subtotal * taxRate;
  return subtotal + tax;
};

// @AI:CONSTRAINT Do not call external payment SDKs here.
// @AI:INVARIANT Discount must not exceed subtotal.
export const applyDiscount = (subtotal: number, discount: number): number => {
  if (discount > subtotal) return subtotal;
  return subtotal - discount;
};

// @AI:SYNC src/core/tagParser.ts
// @AI:SYNC src/core/tagParser.ts:L10
// @AI:SYNC src/core/tagParser.ts:L10-L20
// @AI:SYNC src/core/tagParser.ts#parseAiTagFromLine
// @AI:UNCERTAIN Needs performance review under large inputs.
export const normalizeNotes = (notes: string[]): string[] => {
  return notes.map((note) => note.trim()).filter((note) => note.length > 0);
};

// @AI:EXPIRY 2026-01-01
// @AI:PROMPT Replace with a shared utility once available.
export const formatCurrency = (value: number, currency: string): string => {
  return `${currency} ${value.toFixed(2)}`;
};

// @AI:CRITICAL Sensitive metadata handling.
// @AI:CONSTRAINT Do not log raw values.
export const redactToken = (token: string): string => {
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

// @AI:FROZEN Legacy behavior required by older clients.
// @AI:EXPIRY 2027-12-31 UTC
export const legacyRateMap = new Map<string, number>([
  ['USD', 1],
  ['KRW', 1350]
]);

// @AI:EXPIRY ${EXPIRY_DATE}
// @AI:SYNC src/does-not-exist.ts
export const expiredExample = (): void => {
  // Intentionally empty.
};
