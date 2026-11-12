import { BusinessSettings, Customer } from '../types';
import { formatDate, toBengaliDigits } from './dateUtils';
import { formatDueNumber, toEnglishDigits } from './dueUtils';

/**
 * Normalizes a Bangladeshi phone / WhatsApp number:
 * - Converts Bengali digits to English digits
 * - Strips all non-digit characters
 * - Converts leading 0 to 880 (e.g. 01712345678 -> 8801712345678)
 * - Prepends 880 to 10-digit numbers starting with 1
 * - Validates format: 8801[3-9]\d{8}
 */
export function normalizeWhatsAppNumber(input?: string): {
  raw: string;
  normalized: string;
  isValid: boolean;
  warning?: string;
} {
  const raw = (input || '').trim();
  if (!raw) {
    return { raw: '', normalized: '', isValid: false };
  }

  // Convert Bengali digits to English
  const english = toEnglishDigits(raw);
  // Strip non-digits
  const digits = english.replace(/\D/g, '');

  let normalized = digits;
  if (digits.startsWith('880')) {
    normalized = digits;
  } else if (digits.startsWith('0')) {
    normalized = '880' + digits.substring(1);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    normalized = '880' + digits;
  }

  // Bangladesh mobile numbers are typically 13 digits starting with 8801[3-9]
  const isValid = /^8801[3-9]\d{8}$/.test(normalized);
  const warning = isValid
    ? undefined
    : 'নম্বরটি সঠিক মনে হচ্ছে না (যেমন: 01712345678 বা 8801712345678)';

  return {
    raw,
    normalized,
    isValid,
    warning,
  };
}

/**
 * Normalizes Facebook Profile input:
 * - Extracts username or numeric ID from facebook.com links or raw input
 * - Strips `@`, query parameters (e.g. ?mibextid=...), and trailing slashes
 */
export function normalizeFacebookProfile(input?: string): {
  raw: string;
  usernameOrId: string;
  profileUrl: string;
  messengerUrl: string;
  isValid: boolean;
} {
  const raw = (input || '').trim();
  if (!raw) {
    return {
      raw: '',
      usernameOrId: '',
      profileUrl: '',
      messengerUrl: 'https://www.messenger.com/',
      isValid: false,
    };
  }

  let clean = raw;

  // Check for profile.php?id=123456789
  const profileIdMatch = clean.match(/profile\.php\?id=(\d+)/i);
  if (profileIdMatch && profileIdMatch[1]) {
    const id = profileIdMatch[1];
    return {
      raw,
      usernameOrId: id,
      profileUrl: `https://www.facebook.com/profile.php?id=${id}`,
      messengerUrl: `https://m.me/${id}`,
      isValid: true,
    };
  }

  // Check for https://(www|m|web.)facebook.com/username or fb.com/username
  const fbUrlMatch = clean.match(/(?:https?:\/\/)?(?:www\.|web\.|m\.)?(?:facebook|fb)\.com\/([a-zA-Z0-9._]+)/i);
  if (fbUrlMatch && fbUrlMatch[1]) {
    clean = fbUrlMatch[1];
  } else {
    // Strip URL protocols or domain if partially typed
    clean = clean.replace(/^https?:\/\//i, '').replace(/^(?:www\.|web\.|m\.)?(?:facebook|fb)\.com\/?/i, '');
  }

  // Strip leading @, trailing slashes, and URL query params
  clean = clean.replace(/^@+/, '').split('?')[0].split('/')[0].trim();

  // Basic username validation (letters, numbers, dots, underscores, length >= 3)
  const isValid = /^[a-zA-Z0-9._]{3,50}$/.test(clean);

  return {
    raw,
    usernameOrId: clean,
    profileUrl: clean ? `https://www.facebook.com/${clean}` : 'https://www.facebook.com/',
    messengerUrl: clean ? `https://m.me/${clean}` : 'https://www.messenger.com/',
    isValid,
  };
}

/**
 * Extracts customer personal name or full display name based on setting
 * - If includeShopOrArea is false (default): extracts ONLY personal name,
 *   stripping comma-separated place/area (e.g. "মামুন, মাছপাড়া" -> "মামুন").
 * - If includeShopOrArea is true: includes shop and full name as before.
 */
export function getCustomerDisplayName(
  customer: Customer,
  includeShopOrArea: boolean = false
): string {
  if (includeShopOrArea) {
    if (customer.shopName && customer.name && customer.shopName.trim() !== customer.name.trim()) {
      return `${customer.shopName} (${customer.name})`;
    }
    return customer.shopName || customer.name || 'গ্রাহক';
  }

  // Personal name only: take portion before the first comma, ignore shop/area
  const rawName = customer.name?.trim() || customer.shopName?.trim() || 'গ্রাহক';
  const beforeComma = rawName.split(',')[0].trim();
  return beforeComma || 'গ্রাহক';
}

/**
 * Default Due Message Template in Bengali
 * First line: "সম্মানিত {নাম},"
 * Second line: "{ব্যবসার_নাম} থেকে আপনার বকেয়া হিসাব বিবরণ:"
 */
export const DEFAULT_DUE_MESSAGE_TEMPLATE = `সম্মানিত {নাম},
{ব্যবসার_নাম} থেকে আপনার বকেয়া হিসাব বিবরণ:

{বাকির_তালিকা}

মোট বকেয়া: ৳{মোট_বকেয়া}

অনুগ্রহ করে হিসাবটি দেখে দ্রুত পরিশোধের ব্যবস্থা করবেন। কোনো গরমিল থাকলে আমাদের সাথে যোগাযোগ করুন। ধন্যবাদ।
— {মালিকের_নাম}, {ব্যবসার_নাম}
মোবাইল: {অফিসের_ফোন}`;

/**
 * Automatically migrates saved template:
 * - If first line contains old greeting like 'আসসালামু আলাইকুম', updates to 'সম্মানিত {নাম},'
 * - If owner custom edited his template, keeps his custom text intact
 */
export function migrateDueMessageTemplate(savedTemplate?: string): {
  updatedTemplate: string;
  wasMigrated: boolean;
} {
  if (!savedTemplate) {
    return { updatedTemplate: DEFAULT_DUE_MESSAGE_TEMPLATE, wasMigrated: false };
  }

  const lines = savedTemplate.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.includes('আসসালামু আলাইকুম')) {
      lines[0] = 'সম্মানিত {নাম},';
      return {
        updatedTemplate: lines.join('\n'),
        wasMigrated: true,
      };
    }
  }

  return { updatedTemplate: savedTemplate, wasMigrated: false };
}

export interface ShareDueItem {
  id?: string;
  dueNo?: string;
  rawDueNo?: string;
  date?: string;
  amount: number; // remainingAmount
  originalAmount?: number;
  isPartiallyPaid?: boolean;
  ledgerId?: string;
}

/**
 * Generates the formatted message text using the template and customer dues
 */
export function generateDueMessageText(params: {
  customer: Customer;
  dues: ShareDueItem[];
  settings: BusinessSettings;
  customTemplate?: string;
  maxDuesLines?: number;
  adjustmentAmount?: number;
  allRemainingTicked?: boolean;
}): string {
  const {
    customer,
    dues,
    settings,
    customTemplate,
    maxDuesLines = 15,
    adjustmentAmount = 0,
    allRemainingTicked = false,
  } = params;

  // Sort dues in ascending order of due number / date
  const sortedDues = [...dues].sort((a, b) => {
    const noA = (a.rawDueNo || a.dueNo || '').replace(/\D/g, '');
    const noB = (b.rawDueNo || b.dueNo || '').replace(/\D/g, '');
    if (noA && noB && !isNaN(Number(noA)) && !isNaN(Number(noB))) {
      return Number(noA) - Number(noB);
    }
    return (a.date || '').localeCompare(b.date || '');
  });

  const duesSubtotal = sortedDues.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Format dues lines up to maxDuesLines (default 15)
  const displayDues = sortedDues.slice(0, maxDuesLines);
  const remainingDues = sortedDues.slice(maxDuesLines);

  const duesLines = displayDues.map((d) => {
    const dueNum = d.rawDueNo || d.dueNo || '';
    const numStr = dueNum ? `বাকি নং ${formatDueNumber(dueNum)} ` : '';
    const dateStr = d.date ? `(${formatDate(d.date)})` : '';
    const amtStr = `৳${d.amount.toLocaleString('bn-BD')}`;
    return `• ${numStr}${dateStr}: ${amtStr}`.trim();
  });

  if (remainingDues.length > 0) {
    const remCount = remainingDues.length;
    const remSum = remainingDues.reduce((sum, d) => sum + (d.amount || 0), 0);
    duesLines.push(
      `…আরও ${toBengaliDigits(remCount)} টি বাকি (মোট ৳${remSum.toLocaleString('bn-BD')})`
    );
  }

  // If all remaining dues are ticked and there's an unallocated adjustment, show adjustment line
  let finalTotal = duesSubtotal;
  if (allRemainingTicked && adjustmentAmount !== 0) {
    const adjAbs = Math.abs(adjustmentAmount).toLocaleString('bn-BD');
    if (adjustmentAmount > 0) {
      duesLines.push(`• পূর্বের হিসাব সমন্বয়: ৳${adjAbs}`);
    } else {
      duesLines.push(`• পূর্বের হিসাব সমন্বয়: -৳${adjAbs}`);
    }
    finalTotal += adjustmentAmount;
  }

  const duesListFormatted = duesLines.length > 0 ? duesLines.join('\n') : 'কোনো বকেয়া বাকি নেই';

  // Personal name only unless setting switch is enabled
  const customerDisplayName = getCustomerDisplayName(customer, settings.includeShopInDueMessage);

  const template = (customTemplate || settings.dueMessageTemplate || DEFAULT_DUE_MESSAGE_TEMPLATE).trim();

  let message = template
    .replace(/\{নাম\}/g, customerDisplayName)
    .replace(/\{বাকির_তালিকা\}/g, duesListFormatted)
    .replace(/\{মোট_বকেয়া\}/g, finalTotal.toLocaleString('bn-BD'))
    .replace(/\{ব্যবসার_নাম\}/g, settings.businessName || 'MM TRADERS')
    .replace(/\{মালিকের_নাম\}/g, settings.proprietorName || 'Mohammad Mamun')
    .replace(/\{অফিসের_ফোন\}/g, settings.phone || '01757200400');

  return message;
}

/**
 * Robust copy to clipboard with fallback for iframes/embedded browsers
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard.writeText failed, using fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}

/**
 * Formats an ISO date-time into a human-friendly Bengali string
 */
export function formatMessageDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = String(hours).padStart(2, '0');

    return `${day}/${month}/${year}, ${hourStr}:${minutes} ${ampm}`;
  } catch {
    return '-';
  }
}
