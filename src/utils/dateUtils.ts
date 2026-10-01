/**
 * Central Date Formatting Utilities for MM TRADERS ERP
 * Standard Bangladeshi DD/MM/YYYY (দিন/মাস/বছর) format everywhere
 */

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const toBengaliDigits = (num: number | string): string => {
  return String(num).replace(/\d/g, (w) => BENGALI_DIGITS[+w]);
};

/**
 * Formats a date string (YYYY-MM-DD, ISO, or Date) into standard Bangladeshi DD/MM/YYYY format.
 * E.g., "2026-10-01" -> "01/10/2026"
 */
export const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  try {
    if (dateStr instanceof Date) {
      if (isNaN(dateStr.getTime())) return '';
      const d = String(dateStr.getDate()).padStart(2, '0');
      const m = String(dateStr.getMonth() + 1).padStart(2, '0');
      const y = dateStr.getFullYear();
      return `${d}/${m}/${y}`;
    }

    const str = String(dateStr).trim();
    if (!str) return '';

    // If already in DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      return str;
    }

    // Match YYYY-MM-DD
    const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }

    // Try parsing as Date
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }

    return str;
  } catch {
    return String(dateStr);
  }
};

/**
 * Formats date into Bengali DD/MM/YYYY format
 * E.g., "2026-10-01" -> "০১/১০/২০২৬"
 */
export const formatDateBnDigits = (dateStr?: string | Date | null): string => {
  const enFormatted = formatDate(dateStr);
  return toBengaliDigits(enFormatted);
};

/**
 * Formats date with weekday name in Bengali: "DD/MM/YYYY (দিন)"
 * E.g., "01/10/2026 (বৃহঃ)"
 */
export const formatDateWithWeekdayBn = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  try {
    const formatted = formatDate(dateStr);
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m - 1, d);
      const daysBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
      const dayName = daysBn[dateObj.getDay()];
      return `${formatted} (${dayName})`;
    }
    return formatted;
  } catch {
    return formatDate(dateStr);
  }
};

/**
 * Formats full Bengali date with Bengali month name: "DD Month YYYY (Weekday)"
 * E.g., "০১ অক্টোবর ২০২৬ (বৃহস্পতিবার)"
 */
export const formatFullBengaliDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m - 1, d);

      const months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const weekdays = [
        'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
      ];

      return `${toBengaliDigits(d)} ${months[m - 1]} ${toBengaliDigits(y)} (${weekdays[dateObj.getDay()]})`;
    }
    return formatDate(dateStr);
  } catch {
    return String(dateStr);
  }
};
