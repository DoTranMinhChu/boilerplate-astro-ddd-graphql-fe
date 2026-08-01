export type FormatNumberOptions = Partial<{
  currency: boolean | string;
  compact: boolean;
  percent: boolean;
  signDisplay: 'auto' | 'always' | 'never';
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  decimalSeparator: 'period' | 'comma';
}>;
export function formatNumber(
  number: string | number | null | undefined,
  {
    currency = undefined,
    compact = false,
    percent = false,
    signDisplay = 'auto',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    decimalSeparator = 'comma',
  }: FormatNumberOptions = {},
) {
  if (number === null) return '';

  let value = Number(number);
  if (isNaN(value)) value = 0;

  return new Intl.NumberFormat(
    decimalSeparator == 'period' ? 'en-US' : 'vi-VN',
    {
      notation: compact ? 'compact' : 'standard',
      compactDisplay: 'short',
      style: currency ? 'currency' : percent ? 'percent' : 'decimal',
      currency: currency
        ? typeof currency == 'boolean'
          ? 'đ'
          : currency
        : undefined,
      currencyDisplay: 'symbol',
      signDisplay,
      minimumFractionDigits,
      maximumFractionDigits,
    } as Intl.NumberFormatOptions,
  ).format(value);
}

export function formatCurrency(number: string | number | null | undefined) {
  return `${formatNumber(number)}đ`;
}

/** format a number into a neat lookign string */
/** parse text into number */
export function parseStringToNumber(
  text: string,
  {
    decimalSeparator = 'comma',
  }: {
    decimalSeparator: 'period' | 'comma';
  } = {
    decimalSeparator: 'comma',
  },
) {
  if (text === '') return null;
  let valueText = (text || '').trim();
  if (decimalSeparator == 'comma') {
    valueText = valueText
      .replace(/[^0-9\-,]/g, '')
      .replace(',', '.')
      .trim();
  } else {
    valueText = valueText.replace(/[^0-9\-.]/g, '').trim();
  }
  if (valueText.endsWith('.')) valueText += '0';
  const value = Number(valueText);
  return isNaN(value) ? 0 : value;
}

/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param decimal Number of decimal places to display.
 *
 * @return Formatted string.
 */
export function formatFileSize(
  bytes: number,
  si: boolean = false,
  decimal = 1,
) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** decimal;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(decimal) + ' ' + units[u];
}
