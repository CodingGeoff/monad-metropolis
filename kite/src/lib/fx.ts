export const DISPLAY_CURRENCIES = [
  { code: 'JPY', name: 'Japanese yen', perUsd: 150.0, symbol: '¥', digits: 0 },
  { code: 'EUR', name: 'Euro', perUsd: 0.92, symbol: '€', digits: 2 },
  { code: 'GBP', name: 'British pound', perUsd: 0.78, symbol: '£', digits: 2 },
  { code: 'SGD', name: 'Singapore dollar', perUsd: 1.35, symbol: 'S$', digits: 2 },
  { code: 'CNY', name: 'Chinese yuan', perUsd: 7.2, symbol: '¥', digits: 2 },
  { code: 'USD', name: 'US dollar', perUsd: 1, symbol: '$', digits: 2 },
] as const;

export function localEstimate(ausd: number, currencyCode: string) {
  const currency = DISPLAY_CURRENCIES.find((item) => item.code === currencyCode) ?? DISPLAY_CURRENCIES[0];
  const value = ausd * currency.perUsd;
  return `${currency.symbol}${value.toLocaleString('en-US', { minimumFractionDigits: currency.digits, maximumFractionDigits: currency.digits })}`;
}
