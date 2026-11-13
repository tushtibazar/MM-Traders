import { BusinessSettings, Customer } from '../types';
import { formatDate, toBengaliDigits } from './dateUtils';
import { formatDueNumber, naturalCompareDueNumbers, toEnglishDigits } from './dueUtils';
import {
  DEFAULT_DUE_MESSAGE_TEMPLATE,
  DEFAULT_DUE_LIST_MESSAGE_TEMPLATE,
} from '../constants/shareTemplates';

export { DEFAULT_DUE_MESSAGE_TEMPLATE, DEFAULT_DUE_LIST_MESSAGE_TEMPLATE };

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

// Template constants imported & re-exported from ../constants/shareTemplates

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

// DEFAULT_DUE_LIST_MESSAGE_TEMPLATE imported & re-exported from ../constants/shareTemplates

export interface DueListShareItem {
  id: string;
  rawDueNo: string;
  dueNo: string;
  customerId: string;
  customerName: string; // full display name (shop & area)
  phone?: string;
  amount: number; // remainingAmount
  originalAmount: number;
  route: string; // route name or 'রুট উল্লেখ নেই'
  date?: string;
}

export interface GenerateAllDuesMessageParams {
  items: DueListShareItem[];
  recipientName: string;
  designation: string;
  settings: BusinessSettings;
  customTemplate?: string;
  dateStr?: string;
  groupByRoute: boolean;
  combineByCustomer: boolean;
  sortBy: 'due_no' | 'amount_desc' | 'name';
  includePhone: boolean;
  summaryOnly: boolean;
}

/**
 * Natural comparison helper for due numbers (reuses shared naturalCompareDueNumbers)
 */
function naturalCompare(a?: string | null, b?: string | null): number {
  return naturalCompareDueNumbers(a || '', b || '');
}

/**
 * Generates the complete formatted message text for All Dues Share
 */
export function generateAllDuesMessageText(params: GenerateAllDuesMessageParams): string {
  const {
    items,
    recipientName,
    designation,
    settings,
    customTemplate,
    dateStr,
    groupByRoute,
    combineByCustomer,
    sortBy,
    includePhone,
    summaryOnly,
  } = params;

  const totalDuesCount = items.length;
  const uniqueCustomerIds = new Set(items.map((i) => i.customerId));
  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

  const formattedDate = formatDate(dateStr || new Date().toISOString().slice(0, 10));

  // Build header using template
  const template = (customTemplate || settings.dueListMessageTemplate || DEFAULT_DUE_LIST_MESSAGE_TEMPLATE).trim();
  const header = template
    .replace(/\{প্রাপকের_নাম\}/g, recipientName || 'কর্মী')
    .replace(/\{পদবী\}/g, designation || 'SR')
    .replace(/\{ব্যবসার_নাম\}/g, settings.businessName || 'MM TRADERS')
    .replace(/\{তারিখ\}/g, formattedDate)
    .replace(/\{মোট_সংখ্যা\}/g, toBengaliDigits(totalDuesCount))
    .replace(/\{মোট_কাস্টমার\}/g, toBengaliDigits(uniqueCustomerIds.size))
    .replace(/\{মোট_বকেয়া\}/g, totalAmount.toLocaleString('bn-BD'));

  // Sort comparator
  const sortComparator = (a: DueListShareItem, b: DueListShareItem) => {
    if (sortBy === 'amount_desc') {
      return b.amount - a.amount;
    }
    if (sortBy === 'name') {
      return (a.customerName || '').localeCompare(b.customerName || '', 'bn');
    }
    return naturalCompare(a.rawDueNo || a.dueNo, b.rawDueNo || b.dueNo);
  };

  const bodyLines: string[] = [];

  if (summaryOnly) {
    // Only route subtotals
    const routeMap = new Map<string, { count: number; total: number }>();
    items.forEach((item) => {
      const r = item.route || 'রুট উল্লেখ নেই';
      const cur = routeMap.get(r) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += item.amount;
      routeMap.set(r, cur);
    });

    const routeKeys = Array.from(routeMap.keys()).sort((a, b) => {
      if (a === 'রুট উল্লেখ নেই') return 1;
      if (b === 'রুট উল্লেখ নেই') return -1;
      return a.localeCompare(b, 'bn');
    });

    routeKeys.forEach((r) => {
      const stat = routeMap.get(r)!;
      bodyLines.push(
        `*[${r}]* — ${toBengaliDigits(stat.count)} টি, ৳${stat.total.toLocaleString('bn-BD')}`
      );
    });
  } else if (groupByRoute) {
    // Group by route with 'রুট উল্লেখ নেই' coming last
    const routeMap = new Map<string, DueListShareItem[]>();
    items.forEach((item) => {
      const r = item.route || 'রুট উল্লেখ নেই';
      const list = routeMap.get(r) || [];
      list.push(item);
      routeMap.set(r, list);
    });

    const routeKeys = Array.from(routeMap.keys()).sort((a, b) => {
      if (a === 'রুট উল্লেখ নেই') return 1;
      if (b === 'রুট উল্লেখ নেই') return -1;
      return a.localeCompare(b, 'bn');
    });

    routeKeys.forEach((route) => {
      const routeItems = routeMap.get(route) || [];
      const routeCount = routeItems.length;
      const routeSubtotal = routeItems.reduce((s, i) => s + i.amount, 0);

      bodyLines.push(
        `\n*[${route}]* — ${toBengaliDigits(routeCount)} টি, ৳${routeSubtotal.toLocaleString('bn-BD')}`
      );

      if (combineByCustomer) {
        // Group by customer in this route
        const custMap = new Map<
          string,
          {
            customerId: string;
            customerName: string;
            phone?: string;
            dueNos: string[];
            totalAmount: number;
          }
        >();

        routeItems.forEach((item) => {
          const cur = custMap.get(item.customerId) || {
            customerId: item.customerId,
            customerName: item.customerName,
            phone: item.phone,
            dueNos: [],
            totalAmount: 0,
          };
          if (item.rawDueNo || item.dueNo) {
            cur.dueNos.push(item.rawDueNo || item.dueNo);
          }
          cur.totalAmount += item.amount;
          custMap.set(item.customerId, cur);
        });

        const custGroups = Array.from(custMap.values());
        // Sort customer groups by their LARGEST due number (ascending)
        custGroups.sort((a, b) => {
          if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
          if (sortBy === 'name') return a.customerName.localeCompare(b.customerName, 'bn');
          const sortedA = [...a.dueNos].sort(naturalCompare);
          const sortedB = [...b.dueNos].sort(naturalCompare);
          const lastA = sortedA[sortedA.length - 1];
          const lastB = sortedB[sortedB.length - 1];
          return naturalCompare(lastA, lastB);
        });

        custGroups.forEach((cg) => {
          const sortedDueNos = [...cg.dueNos].sort(naturalCompare);
          const duesLabel = sortedDueNos.map((n) => toBengaliDigits(formatDueNumber(n))).join(', ') || '—';
          const phoneLabel = includePhone && cg.phone ? ` (${cg.phone})` : '';
          bodyLines.push(
            `${duesLabel} | ${cg.customerName}${phoneLabel} | ৳${cg.totalAmount.toLocaleString('bn-BD')}`
          );
        });
      } else {
        // Individual due lines
        const sortedRouteItems = [...routeItems].sort(sortComparator);
        sortedRouteItems.forEach((item) => {
          const dueNum = toBengaliDigits(formatDueNumber(item.rawDueNo || item.dueNo));
          const phoneLabel = includePhone && item.phone ? ` (${item.phone})` : '';
          bodyLines.push(
            `${dueNum} | ${item.customerName}${phoneLabel} | ৳${item.amount.toLocaleString('bn-BD')}`
          );
        });
      }
    });
  } else {
    // Flat list (no route grouping)
    if (combineByCustomer) {
      const custMap = new Map<
        string,
        {
          customerId: string;
          customerName: string;
          phone?: string;
          dueNos: string[];
          totalAmount: number;
        }
      >();

      items.forEach((item) => {
        const cur = custMap.get(item.customerId) || {
          customerId: item.customerId,
          customerName: item.customerName,
          phone: item.phone,
          dueNos: [],
          totalAmount: 0,
        };
        if (item.rawDueNo || item.dueNo) cur.dueNos.push(item.rawDueNo || item.dueNo);
        cur.totalAmount += item.amount;
        custMap.set(item.customerId, cur);
      });

      const custGroups = Array.from(custMap.values());
      custGroups.sort((a, b) => {
        if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
        if (sortBy === 'name') return a.customerName.localeCompare(b.customerName, 'bn');
        const sortedA = [...a.dueNos].sort(naturalCompare);
        const sortedB = [...b.dueNos].sort(naturalCompare);
        const lastA = sortedA[sortedA.length - 1];
        const lastB = sortedB[sortedB.length - 1];
        return naturalCompare(lastA, lastB);
      });

      custGroups.forEach((cg) => {
        const sortedDueNos = [...cg.dueNos].sort(naturalCompare);
        const duesLabel = sortedDueNos.map((n) => toBengaliDigits(formatDueNumber(n))).join(', ') || '—';
        const phoneLabel = includePhone && cg.phone ? ` (${cg.phone})` : '';
        bodyLines.push(
          `${duesLabel} | ${cg.customerName}${phoneLabel} | ৳${cg.totalAmount.toLocaleString('bn-BD')}`
        );
      });
    } else {
      const sortedItems = [...items].sort(sortComparator);
      sortedItems.forEach((item) => {
        const dueNum = toBengaliDigits(formatDueNumber(item.rawDueNo || item.dueNo));
        const phoneLabel = includePhone && item.phone ? ` (${item.phone})` : '';
        bodyLines.push(
          `${dueNum} | ${item.customerName}${phoneLabel} | ৳${item.amount.toLocaleString('bn-BD')}`
        );
      });
    }
  }

  // End line
  bodyLines.push(`\n*সর্বমোট: ৳${totalAmount.toLocaleString('bn-BD')}*`);

  return `${header}\n\n${bodyLines.join('\n').trim()}`;
}

export interface SplitMessagePart {
  partIndex: number; // 1-indexed
  totalParts: number;
  partLabel: string; // e.g. "১/৩"
  text: string;
}

/**
 * Splits a long due list message into safe WhatsApp parts:
 * - Conservative limit of ~1700 characters per link (never cut lines in half)
 * - Part 1 contains the header
 * - The last part contains the *সর্বমোট: ৳[total]* line
 * - Route headings are repeated if a route continues across parts
 * - Each part labeled with " (১/৩)"
 */
export function splitDueListMessage(
  fullMessage: string,
  recipientName: string = 'কর্মী',
  maxCharsPerPart: number = 1600
): SplitMessagePart[] {
  // If the message is short enough, return single part
  if (fullMessage.length <= maxCharsPerPart) {
    return [
      {
        partIndex: 1,
        totalParts: 1,
        partLabel: '১/১',
        text: fullMessage,
      },
    ];
  }

  const lines = fullMessage.split('\n');
  const rawParts: string[][] = [];
  let currentPartLines: string[] = [];
  let currentLength = 0;
  let activeRouteHeading: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect route heading line e.g. "*[রুট ১]* — ১০ টি, ৳৫,০০০"
    if (line.startsWith('*[') && line.includes(']*')) {
      activeRouteHeading = line;
    } else if (line.startsWith('*সর্বমোট:')) {
      activeRouteHeading = null;
    }

    const lineLength = line.length + 1; // +1 for newline

    // Check if adding this line would exceed the limit
    if (currentLength + lineLength > maxCharsPerPart && currentPartLines.length > 0) {
      rawParts.push([...currentPartLines]);
      currentPartLines = [];
      currentLength = 0;

      // Skip leading blank line on a new part
      if (line.trim() === '') {
        continue;
      }

      // If a route was in progress and this line isn't a new route heading or total, repeat route heading
      if (activeRouteHeading && !line.startsWith('*[') && !line.startsWith('*সর্বমোট:')) {
        const continuationHeading = `${activeRouteHeading} (চলমান)`;
        currentPartLines.push(continuationHeading);
        currentLength += continuationHeading.length + 1;
      }
    }

    currentPartLines.push(line);
    currentLength += lineLength;
  }

  if (currentPartLines.length > 0) {
    rawParts.push(currentPartLines);
  }

  const totalParts = Math.max(1, rawParts.length);

  return rawParts.map((partLines, idx) => {
    const partNum = idx + 1;
    const label = `${toBengaliDigits(partNum)}/${toBengaliDigits(totalParts)}`;

    let partText = partLines.join('\n').trim();

    // If part 1, append label in the first line or header
    if (partNum === 1) {
      const firstBreak = partText.indexOf('\n');
      if (firstBreak !== -1) {
        const line1 = partText.slice(0, firstBreak);
        const rest = partText.slice(firstBreak);
        partText = `${line1} (${label})${rest}`;
      } else {
        partText = `${partText} (${label})`;
      }
    } else {
      // For parts > 1, add a top prefix identifying recipient & part
      partText = `[অংশ ${label} — ${recipientName}]\n${partText}`;
    }

    return {
      partIndex: partNum,
      totalParts,
      partLabel: label,
      text: partText,
    };
  });
}
