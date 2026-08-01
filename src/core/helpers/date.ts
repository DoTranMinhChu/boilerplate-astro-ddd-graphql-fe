import {
  FormatDistanceStrictUnit,
  Locale,
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isValid,
  parse,
  setDefaultOptions,
} from 'date-fns';
import { format, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { enUS } from 'date-fns/locale/en-US';
import { vi } from 'date-fns/locale/vi';

export type SupportedLanguage = 'vi' | 'en';

/** Timezone của browser client — dùng làm default cho mọi format */
const CLIENT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const getDateLocale = async (language: SupportedLanguage): Promise<Locale> => {
  switch (language) {
    case 'en': return enUS;
    case 'vi':
    default: return vi;
  }
};

export const setDefaultDateOptions = async (
  {
    language = 'vi',
    weekStartsDay = 'monday',
  }: {
    language: SupportedLanguage;
    weekStartsDay: 'sunday' | 'monday';
  } = { language: 'vi', weekStartsDay: 'monday' },
) => {
  const weekStartsOn = weekStartsDay === 'monday' ? 1 : 0;
  const locale = await getDateLocale(language);
  setDefaultOptions({ weekStartsOn, locale });
};

/**
 * Lấy UTC offset (phút) của một timezone tại một thời điểm cụ thể.
 * Có tính đến DST. VD: Asia/Saigon → 420, America/New_York (summer) → -240
 */
const getTzOffsetMinutes = (date: Date, timeZone: string): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  const hour = get('hour') % 24; // handle "24:00:00" edge case
  const zonedUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));

  return Math.round((zonedUtc - date.getTime()) / 60_000);
};

/**
 * Normalize bất kỳ input nào → Date object (UTC internally, luôn đúng).
 * Handles: Date | ISO string | "yyyy-MM-dd HH:mm:ss.SSS +0700" | timestamp | null
 */
export const normalizeDate = (
  date: Date | string | number | null | undefined,
): Date | null => {
  if (!date) return null;

  try {
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    }

    if (typeof date === 'number') {
      const ts = date < 10_000_000_000 ? date * 1000 : date;
      const d = new Date(ts);
      return isValid(d) ? d : null;
    }

    if (typeof date === 'string') {
      // Thử parse numeric string
      const num = Number(date);
      if (!isNaN(num) && date.trim() !== '') {
        const ts = num < 10_000_000_000 ? num * 1000 : num;
        const d = new Date(ts);
        if (isValid(d)) return d;
      }

      // Bare date "YYYY-MM-DD" — ECMAScript parse thành UTC midnight, nhưng
      // ngữ nghĩa thực tế là "ngày này" theo local → dùng local midnight.
      if (/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        const [y, m, d] = date.trim().split('-').map(Number);
        const result = new Date(y, m - 1, d);
        return isValid(result) ? result : null;
      }

      // new Date() xử lý được: ISO 8601, RFC 2822
      let d = new Date(date);
      if (isValid(d)) return d;

      // Normalize format lạ: "2021-08-11 00:00:00.000 +0700" → ISO
      const normalized = date
        .replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2') // space → T
        .replace(/\s+([+-])(\d{2})(\d{2})$/, '$1$2:$3'); // ±HHMM → ±HH:MM

      if (normalized !== date) {
        d = new Date(normalized);
        if (isValid(d)) return d;
      }

      return null;
    }

    return null;
  } catch (err) {
    console.warn('Failed to normalize date:', date, err);
    return null;
  }
};

export type FormatDatetimeType =
  | 'date'
  | 'time'
  | 'datetime'
  | 'timedate'
  | 'year_month_date'
  | 'dateShortMonth'
  | 'yearfirst'
  | (string & {});

/**
 * Format date theo TIMEZONE CỦA CLIENT (browser).
 * Không phụ thuộc vào system timezone của server/OS.
 *
 * VD: "1992-02-24T17:00:00.000Z" + CLIENT_TZ="Asia/Saigon" → "25-02-1992"
 * VD: "1992-02-25T15:00:00.000+08:00" + CLIENT_TZ="Asia/Saigon" → "25-02-1992 14:00"
 */
export const formatDatetime = (
  date: Date | string | number | null | undefined,
  formatType: FormatDatetimeType = 'date',
  { locale, timeZone = CLIENT_TZ }: { locale?: Locale; timeZone?: string } = {},
): string => {
  try {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return '';

    let formatString: string;
    switch (formatType) {
      case 'date': formatString = 'dd-MM-yyyy'; break;
      case 'time': formatString = 'HH:mm'; break;
      case 'datetime': formatString = 'dd-MM-yyyy HH:mm'; break;
      case 'timedate': formatString = 'HH:mm dd-MM-yyyy'; break;
      case 'dateShortMonth': formatString = 'dd MMM yyyy'; break;
      case 'yearfirst':
      case 'year_month_date': formatString = 'yyyy-MM-dd'; break;
      default: formatString = formatType; break;
    }

    // date-fns-tz/format nhận thêm timeZone → format đúng giờ địa phương
    return format(normalizedDate, formatString, { locale, timeZone });
  } catch (err) {
    console.warn('Failed to format date:', date, err);
    return '';
  }
};

/**
 * Parse string nhập tay → Date object (UTC internally) theo CLIENT_TZ.
 *
 * Vì date-fns-tz không export `parse`, ta dùng date-fns/parse để lấy
 * wall-clock parts, sau đó build lại ISO string với offset đúng của CLIENT_TZ.
 *
 * VD: user gõ "25-02-1992", CLIENT_TZ = "Asia/Saigon" (UTC+7)
 *   → wall-clock: 1992-02-25 00:00:00
 *   → ISO: "1992-02-25T00:00:00+07:00"
 *   → Date(UTC): 1992-02-24T17:00:00.000Z  ✅
 *
 * VD: user gõ "25-02-1992 14:00", CLIENT_TZ = "Asia/Saigon"
 *   → Date(UTC): 1992-02-25T07:00:00.000Z  ✅
 */
export const parseDate = (
  str: string,
  formatString: string = 'dd-MM-yyyy',
  referenceDate: Date = new Date(),
  timeZone: string = CLIENT_TZ,
): Date | null => {
  try {
    // Bước 1: date-fns/parse → wall-clock đúng (năm/tháng/ngày/giờ/phút)
    // TZ wrapping có thể sai nếu runtime là UTC (Node/SSR), nhưng không sao
    const parsed = parse(str, formatString, referenceDate);
    if (!isValid(parsed)) return null;

    // Bước 2: extract wall-clock parts (chỉ lấy số, bỏ qua TZ của parsed)
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hour = String(parsed.getHours()).padStart(2, '0');
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    const second = String(parsed.getSeconds()).padStart(2, '0');

    // Bước 3: lấy UTC offset của CLIENT_TZ tại ngày đó (có tính DST)
    const refForOffset = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const offsetMinutes = getTzOffsetMinutes(refForOffset, timeZone);
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const offsetHH = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMM = String(absOffset % 60).padStart(2, '0');

    // Bước 4: build ISO string với offset đúng → JS parse ra UTC chính xác
    const isoStr = `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetSign}${offsetHH}:${offsetMM}`;
    const result = new Date(isoStr);
    return isValid(result) ? result : null;
  } catch {
    return null;
  }
};

/**
 * Chuyển Date (UTC internally) → "zoned Date":
 * getFullYear/getMonth/getDate/getHours trả ra giá trị theo CLIENT_TZ.
 * Dùng khi cần đọc wall-clock parts theo client timezone.
 */
export const toClientZonedDate = (
  date: Date | string | number | null | undefined,
  timeZone: string = CLIENT_TZ,
): Date | null => {
  const d = normalizeDate(date);
  if (!d) return null;
  return toZonedTime(d, timeZone);
};

/**
 * Chuyển "zoned Date" (wall-clock của client) → UTC Date.
 * Dùng sau khi đã modify wall-clock parts để gửi lên server.
 */
export const fromClientZonedDate = (
  date: Date | string | number | null | undefined,
  timeZone: string = CLIENT_TZ,
): Date | null => {
  const d = normalizeDate(date);
  if (!d) return null;
  return fromZonedTime(d, timeZone);
};

export const formatDatetimeToNow = (
  date: Date | string | number | null | undefined,
  {
    strict,
    addSuffix,
    includeSeconds,
    unit,
  }: {
    strict?: boolean;
    addSuffix?: boolean;
    includeSeconds?: boolean;
    unit?: FormatDistanceStrictUnit;
  } = {},
): string => {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) return '';

  try {
    if (strict) {
      return formatDistanceToNowStrict(normalizedDate, { addSuffix, unit });
    }
    return formatDistanceToNow(normalizedDate, { addSuffix, includeSeconds });
  } catch (err) {
    console.warn('Failed to format distance to now:', date, err);
    return '';
  }
};

export const isValidDate = (date: Date | string | number | null | undefined): boolean =>
  normalizeDate(date) !== null;

export const toTimestamp = (date: Date | string | number | null | undefined): number | null => {
  const d = normalizeDate(date);
  return d ? d.getTime() : null;
};

export const toUnixTimestamp = (date: Date | string | number | null | undefined): number | null => {
  const d = normalizeDate(date);
  return d ? Math.floor(d.getTime() / 1000) : null;
};

setDefaultDateOptions();