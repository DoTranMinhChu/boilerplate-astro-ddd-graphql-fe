
export const MINIMUM_CODE_LENGTH = 3;
export const MINIMUM_PASSWORD_LENGTH = 8;
/** Use for key, code, or short string */
export const TINY_TEXT_MAX_LENGTH = 64;
/** Use for most everything */
export const SHORT_TEXT_MAX_LENGTH = 256;
/** Use for url, logo */
export const MEDIUM_TEXT_MAX_LENGTH = 1024;
/** Use for documents, articles, rich text,... */
export const LONG_TEXT_MAX_LENGTH = 32768;
export const EMAIL_MAX_LENGTH = 320;

export function normalizeString(text: string | undefined) {
  if (!text) return '';

  return text
    .normalize('NFD')               // Tách các ký tự dấu ra khỏi chữ cái gốc (vd: 'ế' -> 'e' + '̂' + '́')
    .replace(/[\u0300-\u036f]/g, '') // Xóa các ký tự thuộc dải Combining Diacritical Marks (các loại dấu)
    .replace(/đ/g, 'd')             // Xử lý riêng chữ đ thường
    .replace(/Đ/g, 'D');             // Xử lý riêng chữ Đ hoa
}

export function checkUrlValid(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function checkEmailValid(email: string) {
  return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g.test(
    email,
  );
}

export function checkCodeValid(code: string) {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{1,30}[a-zA-Z0-9])?$/g.test(code);
}


export function getLabelByValue(
  value: string | undefined | null,
  options: Option[],
  defaultLabel = ''
): string {
  if (value == null) return defaultLabel;
  const found = options.find(o => o.value === value);
  return found ? found.label : defaultLabel;
}