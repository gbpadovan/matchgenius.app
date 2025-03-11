// Helper to format the amount for display
export function formatAmountForDisplay(
  amount: number,
  currency: string
): string {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  });
  return numberFormat.format(amount / 100);
}

// Helper to format the amount for Stripe
export function formatAmountForStripe(
  amount: number,
  currency: string
): number {
  const currencyToZeroDecimalMap: { [key: string]: boolean } = {
    MGA: true,
    BIF: true,
    CLP: true,
    PYG: true,
    DJF: true,
    RWF: true,
    GNF: true,
    UGX: true,
    JPY: true,
    VND: true,
    VUV: true,
    XAF: true,
    KMF: true,
    XOF: true,
    KRW: true,
    XPF: true,
  };

  const isZeroDecimal = currencyToZeroDecimalMap[currency.toUpperCase()];
  return isZeroDecimal ? amount : Math.round(amount * 100);
} 