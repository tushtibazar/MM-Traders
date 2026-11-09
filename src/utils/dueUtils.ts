import { toBengaliDigits, formatDate } from './dateUtils';
import type { AppDatabase, Customer } from '../types';
import { DEFAULT_ROUTES } from '../services/storage';

/**
 * Converts Bengali digits to English digits
 */
export function toEnglishDigits(str: string): string {
  const bengaliNumerals: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, d => bengaliNumerals[d] || d);
}

/**
 * Sanitizes user input for due number:
 * Converts Bengali digits to English, strips spaces, truncates to 12 chars.
 */
export function sanitizeDueNumberInput(val: string): string {
  if (!val) return '';
  const eng = toEnglishDigits(val);
  // Remove all whitespace
  const noSpace = eng.replace(/\s+/g, '');
  // Keep max 12 chars
  return noSpace.slice(0, 12);
}

/**
 * Normalizes a due number for comparison and uniqueness checking.
 * Strips leading "DUE-" or "DUE", trims, uppercase.
 * If purely numeric, removes leading zeros (e.g. "0125" -> "125", "DUE-0125" -> "125", "DUE-000123" -> "123").
 */
export function normalizeDueNumber(dueNo?: string | null): string {
  if (!dueNo) return '';
  const eng = toEnglishDigits(dueNo.trim().toUpperCase());
  // Strip "DUE-" or "DUE" prefix if present
  let stripped = eng.replace(/^DUE-?/, '');
  // If purely numeric, parse integer to strip leading zeros
  if (/^\d+$/.test(stripped)) {
    const num = parseInt(stripped, 10);
    return isNaN(num) ? stripped : num.toString();
  }
  return stripped;
}

/**
 * Formats a due number cleanly with Bengali digits, e.g. "DUE-000123" -> "DUE-০০MDE..."
 * For standard automatic dues: 6 digits with leading zeros (e.g. DUE-000123)
 * If input is alphanumeric like "A-45" or raw manual number like "497", preserves it cleanly.
 */
export function formatDueNumber(dueNo?: string | null): string {
  if (!dueNo || !dueNo.trim()) return '';
  const clean = dueNo.trim();
  
  // Extract number part
  const english = toEnglishDigits(clean);
  // If it explicitly starts with DUE-
  if (/^DUE-\d+$/i.test(english)) {
    const match = english.match(/\d+/);
    if (match) {
      const numVal = parseInt(match[0], 10);
      if (!isNaN(numVal)) {
        const padded = numVal.toString().padStart(6, '0');
        return `DUE-${toBengaliDigits(padded)}`;
      }
    }
  }
  
  return clean;
}

/**
 * Short representation (e.g. ০০০১২৩ or A-45 or ৪৯৭)
 */
export function formatShortDueNumber(dueNo?: string | null): string {
  if (!dueNo || !dueNo.trim()) return '';
  const clean = dueNo.trim();
  const english = toEnglishDigits(clean);
  if (/^DUE-\d+$/i.test(english)) {
    const match = english.match(/\d+/);
    if (match) {
      const numVal = parseInt(match[0], 10);
      if (!isNaN(numVal)) {
        const padded = numVal.toString().padStart(6, '0');
        return toBengaliDigits(padded);
      }
    }
  }
  return toBengaliDigits(clean);
}

/**
 * Checks if a given due number matches the search input query.
 * Flexible: matches English digits, Bengali digits, with or without "DUE-", with or without leading zeros.
 * Example: Search "123", "১২৩", "000123", "০০০১২৩", "DUE-123", "DUE-000123" all match.
 */
export function matchesDueNumber(targetDueNo?: string | null, searchInput?: string | null): boolean {
  if (!targetDueNo || !searchInput) return false;
  
  const targetClean = targetDueNo.trim().toLowerCase();
  const searchClean = searchInput.trim().toLowerCase();
  
  if (!searchClean) return false;
  
  // Direct substring match
  if (targetClean.includes(searchClean)) return true;
  
  // Extract numeric parts in English
  const targetEng = toEnglishDigits(targetClean);
  const searchEng = toEnglishDigits(searchClean);
  
  const targetNorm = normalizeDueNumber(targetEng);
  const searchNorm = normalizeDueNumber(searchEng);
  
  if (targetNorm && searchNorm && (targetNorm === searchNorm || targetNorm.includes(searchNorm))) {
    return true;
  }
  
  const targetNumMatch = targetEng.match(/\d+/);
  const searchNumMatch = searchEng.match(/\d+/);
  
  if (targetNumMatch && searchNumMatch) {
    const targetNum = parseInt(targetNumMatch[0], 10);
    const searchNum = parseInt(searchNumMatch[0], 10);
    
    // Exact integer match (e.g. 123 matches 000123)
    if (targetNum === searchNum) return true;
    
    // Substring match on numeric string
    if (targetNumMatch[0].includes(searchNumMatch[0])) return true;
  }
  
  // Also check if search is "due-X" or "due X"
  const normalizedSearch = searchEng.replace(/[^0-9a-z]/g, '');
  const normalizedTarget = targetEng.replace(/[^0-9a-z]/g, '');
  if (normalizedTarget && normalizedSearch && normalizedTarget.includes(normalizedSearch)) return true;
  
  return false;
}

/**
 * Natural comparison for due numbers:
 * Sorts numerically by numeric part (e.g. 501 < 502 < 539 < 540).
 * Handles prefixes like "DUE-" or "A-", retaining numeric precedence.
 */
export function naturalCompareDueNumbers(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const cleanA = toEnglishDigits(a.trim());
  const cleanB = toEnglishDigits(b.trim());

  // Check if both are purely numeric (or DUE- followed by numeric)
  const normA = normalizeDueNumber(cleanA);
  const normB = normalizeDueNumber(cleanB);
  const numA = /^\d+$/.test(normA) ? parseInt(normA, 10) : NaN;
  const numB = /^\d+$/.test(normB) ? parseInt(normB, 10) : NaN;

  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  // Check prefix + trailing digits (e.g. A-45, B-12)
  const matchA = cleanA.match(/^(.*?)(\d+)$/);
  const matchB = cleanB.match(/^(.*?)(\d+)$/);

  if (matchA && matchB) {
    const prefixA = matchA[1].toUpperCase();
    const prefixB = matchB[1].toUpperCase();
    if (prefixA === prefixB) {
      return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
    }
    const prefixComp = prefixA.localeCompare(prefixB);
    if (prefixComp !== 0) return prefixComp;
    return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
  }

  if (matchA && !matchB) return -1;
  if (!matchA && matchB) return 1;

  return cleanA.localeCompare(cleanB);
}

/**
 * Checks if a due number falls within [min, max] range (inclusive).
 * Supports English/Bengali digits and natural numeric ranges.
 */
export function isDueNumberInRange(dueNo?: string | null, minStr?: string, maxStr?: string): boolean {
  if (!dueNo) return false;
  const norm = normalizeDueNumber(dueNo);
  const val = parseInt(norm, 10);

  const cleanMin = minStr ? normalizeDueNumber(toEnglishDigits(minStr.trim())) : '';
  const cleanMax = maxStr ? normalizeDueNumber(toEnglishDigits(maxStr.trim())) : '';

  const minVal = cleanMin && /^\d+$/.test(cleanMin) ? parseInt(cleanMin, 10) : null;
  const maxVal = cleanMax && /^\d+$/.test(cleanMax) ? parseInt(cleanMax, 10) : null;

  if (!isNaN(val)) {
    if (minVal !== null && val < minVal) return false;
    if (maxVal !== null && val > maxVal) return false;
    return true;
  }

  // Non-numeric fallback
  if (cleanMin && naturalCompareDueNumbers(dueNo, cleanMin) < 0) return false;
  if (cleanMax && naturalCompareDueNumbers(dueNo, cleanMax) > 0) return false;
  return true;
}

export interface DueNumberUsageInfo {
  normalized: string;
  raw: string;
  customerId?: string;
  customerName?: string;
  date?: string;
  sourceType: 'ledger' | 'sheet' | 'audit_reserved' | 'unsaved_row';
  sourceId?: string;
  sheetId?: string;
}

/**
 * Collects all occupied/reserved due numbers across the system,
 * excluding the record/sheet/row currently being verified.
 */
export function getAllUsedDueNumbers(
  db: AppDatabase,
  options?: {
    excludeLedgerId?: string;
    excludeSheetId?: string;
    excludeRowId?: string;
    excludeDueId?: string;
    excludeDueNos?: string[];
    excludeCustomerId?: string;
  }
): Map<string, DueNumberUsageInfo> {
  const map = new Map<string, DueNumberUsageInfo>();
  const excludeNormSet = new Set<string>(
    (options?.excludeDueNos || []).map((n) => normalizeDueNumber(n)).filter(Boolean)
  );

  // 1. Customer Ledgers
  if (Array.isArray(db.customerLedgers)) {
    for (const entry of db.customerLedgers) {
      if (entry.status === 'voided') continue; // Handled via audit trail if deleted
      if (options?.excludeLedgerId && entry.id === options.excludeLedgerId) continue;
      if (options?.excludeDueId && (entry.id === options.excludeDueId || entry.dueRowId === options.excludeDueId || entry.dueId === options.excludeDueId)) continue;
      if (options?.excludeRowId && (entry.dueRowId === options.excludeRowId || entry.id === options.excludeRowId || entry.dueId === options.excludeRowId)) continue;
      if (options?.excludeSheetId && entry.sheetId && entry.sheetId === options.excludeSheetId) continue;
      if (options?.excludeCustomerId && entry.customerId === options.excludeCustomerId) continue;

      const refDueNo = entry.dueNo || (entry.referenceId && (entry.referenceId.startsWith('DUE-') || /^[0-9]+$/.test(entry.referenceId)) ? entry.referenceId : '');
      if (refDueNo) {
        const norm = normalizeDueNumber(refDueNo);
        if (norm && !excludeNormSet.has(norm) && !map.has(norm)) {
          let custName = entry.customerName;
          if (!custName && entry.customerId && Array.isArray(db.customers)) {
            const c = db.customers.find((cust) => cust.id === entry.customerId);
            if (c) custName = c.shopName || c.name;
          }
          map.set(norm, {
            normalized: norm,
            raw: refDueNo,
            customerId: entry.customerId,
            customerName: custName,
            date: entry.date,
            sourceType: 'ledger',
            sourceId: entry.id,
            sheetId: entry.sheetId,
          });
        }
      }
    }
  }

  // 2. Daily Sheets (todayDueEntries and dueCollectionEntries)
  if (Array.isArray(db.dailySheets)) {
    for (const sheet of db.dailySheets) {
      if (options?.excludeSheetId && sheet.id === options.excludeSheetId) continue;
      const combinedEntries = [
        ...(Array.isArray(sheet.todayDueEntries) ? sheet.todayDueEntries : []),
        ...(Array.isArray(sheet.dueCollectionEntries) ? sheet.dueCollectionEntries : []),
      ];
      for (const row of combinedEntries) {
        if (options?.excludeRowId && (row.id === options.excludeRowId || (row as any).dueId === options.excludeRowId)) continue;
        if (options?.excludeDueId && (row.id === options.excludeDueId || (row as any).dueId === options.excludeDueId)) continue;
        if (options?.excludeLedgerId && row.ledgerId && row.ledgerId === options.excludeLedgerId) continue;
        if (options?.excludeCustomerId && row.customerId === options.excludeCustomerId) continue;
        if (row.dueNo) {
          const norm = normalizeDueNumber(row.dueNo);
          if (norm && !excludeNormSet.has(norm) && !map.has(norm)) {
            map.set(norm, {
              normalized: norm,
              raw: row.dueNo,
              customerId: row.customerId,
              customerName: row.customerName || row.shopName,
              date: sheet.date,
              sourceType: 'sheet',
              sourceId: row.id || sheet.id,
              sheetId: sheet.id,
            });
          }
        }
      }
    }
  }

  // 3. Audit trail: deleted/voided due numbers remain strictly reserved
  if (Array.isArray(db.dueNumberAuditTrail)) {
    for (const trail of db.dueNumberAuditTrail) {
      if (options?.excludeSheetId && trail.sheetId && trail.sheetId === options.excludeSheetId) continue;
      if (options?.excludeLedgerId && trail.ledgerId && trail.ledgerId === options.excludeLedgerId) continue;
      if (options?.excludeRowId && trail.dueRowId && trail.dueRowId === options.excludeRowId) continue;
      if (options?.excludeDueId && (trail.dueId === options.excludeDueId || trail.dueRowId === options.excludeDueId || trail.ledgerId === options.excludeDueId)) continue;

      if (trail.isDeleted) {
        const candidates = [trail.newDueNo, trail.oldDueNo];
        for (const cand of candidates) {
          if (!cand) continue;
          const norm = normalizeDueNumber(cand);
          if (norm && !map.has(norm)) {
            map.set(norm, {
              normalized: norm,
              raw: cand,
              customerId: trail.customerId,
              customerName: trail.customerName,
              date: trail.changedAt ? trail.changedAt.split('T')[0] : (trail.date || undefined),
              sourceType: 'audit_reserved',
              sourceId: trail.id,
              sheetId: trail.sheetId,
            });
          }
        }
      }
    }
  }

  return map;
}

/**
 * Checks if a candidate due number is a duplicate.
 * Checks against database records, reserved audit entries, and current unsaved rows in the UI.
 * A number clashes ONLY when it belongs to a DIFFERENT due/customer.
 */
export function findDueNumberDuplicate(
  candidate: string,
  db: AppDatabase,
  options?: {
    excludeLedgerId?: string;
    excludeSheetId?: string;
    excludeRowId?: string;
    excludeDueId?: string;
    excludeDueNos?: string[];
    excludeCustomerId?: string;
    currentUnsavedRows?: Array<{ id: string; dueNo?: string; customerName?: string; customerId?: string; ledgerId?: string; dueId?: string }>;
  }
): { isDuplicate: boolean; message?: string; existingCustomerName?: string; existingDate?: string } {
  const normCandidate = normalizeDueNumber(candidate);
  if (!normCandidate) {
    return { isDuplicate: false };
  }

  // Check other rows in the same unsaved UI form first
  if (options?.currentUnsavedRows) {
    for (const row of options.currentUnsavedRows) {
      if (options.excludeRowId && (row.id === options.excludeRowId || row.dueId === options.excludeRowId)) continue;
      if (options.excludeDueId && (row.dueId === options.excludeDueId || row.id === options.excludeDueId)) continue;
      if (options.excludeLedgerId && row.ledgerId && row.ledgerId === options.excludeLedgerId) continue;
      if (row.dueNo) {
        const rowNorm = normalizeDueNumber(row.dueNo);
        if (rowNorm === normCandidate) {
          const name = row.customerName || 'অন্য কাস্টমার';
          return {
            isDuplicate: true,
            message: `এই নম্বরটি বর্তমান তালিকায় "${name}" এর জন্য দেওয়া হয়েছে`,
            existingCustomerName: name,
          };
        }
      }
    }
  }

  // Check saved database + audit trail
  const usedMap = getAllUsedDueNumbers(db, {
    excludeLedgerId: options?.excludeLedgerId,
    excludeSheetId: options?.excludeSheetId,
    excludeRowId: options?.excludeRowId,
    excludeDueId: options?.excludeDueId,
    excludeDueNos: options?.excludeDueNos,
    excludeCustomerId: options?.excludeCustomerId,
  });

  const existing = usedMap.get(normCandidate);
  if (existing) {
    if (existing.sourceType === 'audit_reserved') {
      return {
        isDuplicate: true,
        message: `এই নম্বরটি পূর্বে বাতিল বা মুছে ফেলা বাকিতে সংরক্ষিত রয়েছে`,
        existingCustomerName: existing.customerName,
        existingDate: existing.date,
      };
    }
    const custName = existing.customerName || 'অন্য কাস্টমার';
    const dateFormatted = existing.date ? formatDate(existing.date) : 'আগে';
    return {
      isDuplicate: true,
      message: `এই নম্বরটি ইতিমধ্যে "${custName}" এর বাকিতে ব্যবহার হয়েছে (${dateFormatted})`,
      existingCustomerName: custName,
      existingDate: existing.date,
    };
  }

  return { isDuplicate: false };
}

/**
 * Validates the FINAL state of all rows together.
 * - Detects duplicates inside the batch (two rows with the same typed number).
 * - Excludes all old due numbers from the current sheet so that swapping numbers
 *   or keeping a row's own number never causes a false collision.
 * - Single shared validation function for on-blur, morning save, evening save,
 *   customer edit popup, and inline ledger edit.
 */
export function validateBatchDueNumbers(
  rows: Array<{
    id: string;
    dueNo?: string;
    customerName?: string;
    shopName?: string;
    description?: string;
    amount?: number | string | '';
    customerId?: string;
    ledgerId?: string;
    dueId?: string;
  }>,
  db: AppDatabase,
  options?: {
    excludeSheetId?: string;
    sheetDate?: string;
    excludeCustomerId?: string;
  }
): {
  isValid: boolean;
  errors: { [rowId: string]: string };
} {
  const errors: { [rowId: string]: string } = {};

  const activeRows = rows.filter(
    (r) => Boolean(r.dueNo && r.dueNo.trim()) || Boolean(r.description && r.description.trim()) || (Number(r.amount) || 0) > 0
  );

  // 1. Intra-batch duplicate check
  const numberToRows = new Map<string, Array<typeof rows[0]>>();
  for (const r of activeRows) {
    if (!r.dueNo || !r.dueNo.trim()) continue;
    const norm = normalizeDueNumber(r.dueNo);
    if (!norm) continue;
    const list = numberToRows.get(norm) || [];
    list.push(r);
    numberToRows.set(norm, list);
  }

  for (const [, clashRows] of numberToRows.entries()) {
    if (clashRows.length > 1) {
      for (const clashRow of clashRows) {
        errors[clashRow.id] = `একই বাকি নম্বর (${clashRow.dueNo}) তালিকায় একাধিক সারিতে ব্যবহার করা হয়েছে`;
      }
    }
  }

  // 2. Collect all old due numbers belonging to this sheet/batch so they are excluded
  //    when checking external DB records (ensures row keeping own number or two rows swapping numbers passes!)
  const oldNumbersBeingReplaced: string[] = [];
  if (options?.excludeSheetId && Array.isArray(db.dailySheets)) {
    const existingSheet = db.dailySheets.find((s) => s.id === options.excludeSheetId);
    if (existingSheet && Array.isArray(existingSheet.todayDueEntries)) {
      for (const entry of existingSheet.todayDueEntries) {
        if (entry.dueNo) oldNumbersBeingReplaced.push(entry.dueNo);
      }
    }
  }

  // Also include any ledger references that belong to these rows
  if (Array.isArray(db.customerLedgers)) {
    for (const r of activeRows) {
      const rowId = r.dueId || r.id;
      const leg = db.customerLedgers.find((l) => (r.ledgerId && l.id === r.ledgerId) || l.dueRowId === rowId);
      if (leg && (leg.dueNo || leg.referenceId)) {
        oldNumbersBeingReplaced.push(leg.dueNo || leg.referenceId);
      }
    }
  }

  // 3. Check each active row against external database
  for (const r of activeRows) {
    if (!r.dueNo || !r.dueNo.trim()) continue;
    if (errors[r.id]) continue; // already flagged in intra-batch check

    const dup = findDueNumberDuplicate(r.dueNo, db, {
      excludeRowId: r.dueId || r.id,
      excludeDueId: r.dueId || r.id,
      excludeLedgerId: r.ledgerId,
      excludeSheetId: options?.excludeSheetId,
      excludeCustomerId: options?.excludeCustomerId,
      excludeDueNos: oldNumbersBeingReplaced,
    });

    if (dup.isDuplicate) {
      errors[r.id] = dup.message || `বাকি নম্বর "${r.dueNo}" ইতিমধ্যে ব্যবহৃত হয়েছে`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Finds the most recently SAVED due across the database (by saved time/creation time).
 * Live calculation: if an earlier mistaken number (e.g. 99999) was edited to 509,
 * the active record now has 509, so this immediately returns 509.
 */
export function getMostRecentSavedDue(db: AppDatabase): {
  dueNo: string;
  timestamp: number;
} | null {
  interface Candidate {
    dueNo: string;
    timestamp: number;
    orderIndex: number;
  }

  const candidates: Candidate[] = [];

  // 1. From customerLedgers (debit > 0, active)
  if (Array.isArray(db.customerLedgers)) {
    db.customerLedgers.forEach((l, idx) => {
      if (l.status === 'voided') return;
      if (!l.debit || Number(l.debit) <= 0) return;
      const no = l.dueNo || (l.referenceId && (l.referenceId.startsWith('DUE-') || /^[A-Za-z0-9\-_]+$/.test(l.referenceId)) ? l.referenceId : '');
      if (!no) return;

      const t = l.createdAt ? new Date(l.createdAt).getTime() : l.date ? new Date(l.date).getTime() : 0;
      candidates.push({
        dueNo: no,
        timestamp: isNaN(t) ? 0 : t,
        orderIndex: idx,
      });
    });
  }

  // 2. From dailySheets (todayDueEntries)
  if (Array.isArray(db.dailySheets)) {
    db.dailySheets.forEach((s, sIdx) => {
      const sheetTime = s.updatedAt ? new Date(s.updatedAt).getTime() : s.createdAt ? new Date(s.createdAt).getTime() : s.date ? new Date(s.date).getTime() : 0;
      (s.todayDueEntries || []).forEach((e, eIdx) => {
        if (!e.dueNo) return;
        const entryTime = (e as any).createdAt ? new Date((e as any).createdAt).getTime() : sheetTime;
        candidates.push({
          dueNo: e.dueNo,
          timestamp: isNaN(entryTime) ? 0 : entryTime,
          orderIndex: (sIdx + 1) * 10000 + eIdx,
        });
      });
    });
  }

  if (candidates.length === 0) return null;

  // Sort descending by timestamp, then by orderIndex
  candidates.sort((a, b) => {
    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
    return b.orderIndex - a.orderIndex;
  });

  return {
    dueNo: candidates[0].dueNo,
    timestamp: candidates[0].timestamp,
  };
}

/**
 * Formats a numeric value into the pattern of a sample due number:
 * - "502" (no leading zero) -> value 503 -> "503"
 * - "009" (length 3, leading zero) -> value 10 -> "010"
 * - "DUE-000123" (prefix DUE-, length 6) -> value 124 -> "DUE-000124"
 * - "A-45" (prefix A-, length 2) -> value 46 -> "A-46"
 */
export function formatLikeDuePattern(value: number, samplePattern?: string | null): string {
  if (!samplePattern || !samplePattern.trim()) {
    return value.toString();
  }

  const clean = toEnglishDigits(samplePattern.trim());

  // Prefix + trailing digits
  const match = clean.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const digitsStr = match[2];
    const hasLeadingZero = digitsStr.length > 1 && digitsStr.startsWith('0');

    if (hasLeadingZero) {
      const padded = value.toString().padStart(digitsStr.length, '0');
      return `${prefix}${padded}`;
    } else {
      return `${prefix}${value.toString()}`;
    }
  }

  return value.toString();
}

/**
 * Extracts the base seed and pattern from the most recent saved due number,
 * or falls back to db.settings.nextDueNumberCounter.
 */
export function getNextDueNumberSeed(db: AppDatabase): {
  lastDueNo: string | null;
  nextValue: number;
  pattern: string | null;
} {
  const mostRecent = getMostRecentSavedDue(db);
  const fallbackCounter = db.settings?.nextDueNumberCounter && db.settings.nextDueNumberCounter >= 1
    ? db.settings.nextDueNumberCounter
    : 1;

  if (!mostRecent) {
    return {
      lastDueNo: null,
      nextValue: fallbackCounter,
      pattern: null,
    };
  }

  const clean = toEnglishDigits(mostRecent.dueNo.trim());
  const match = clean.match(/^(.*?)(\d+)$/);

  if (match) {
    const val = parseInt(match[2], 10);
    if (!isNaN(val)) {
      return {
        lastDueNo: mostRecent.dueNo,
        nextValue: val + 1,
        pattern: mostRecent.dueNo,
      };
    }
  }

  return {
    lastDueNo: mostRecent.dueNo,
    nextValue: fallbackCounter,
    pattern: null,
  };
}

/**
 * Computes the next suggested due number from live data.
 * Skips already used numbers.
 */
export function getNextSuggestedDueNumber(
  db: AppDatabase,
  pendingRows?: Array<{ dueNo?: string }>,
  options?: { excludeSheetId?: string; excludeLedgerId?: string }
): {
  suggestedDueNo: string;
  lastSavedDueNo: string | null;
} {
  const usedMap = getAllUsedDueNumbers(db, options);
  const pendingNormalized = new Set<string>();

  if (pendingRows) {
    for (const r of pendingRows) {
      if (r.dueNo) {
        const norm = normalizeDueNumber(r.dueNo);
        if (norm) pendingNormalized.add(norm);
      }
    }
  }

  const seed = getNextDueNumberSeed(db);
  let val = seed.nextValue;

  while (true) {
    const candidate = formatLikeDuePattern(val, seed.pattern);
    const norm = normalizeDueNumber(candidate);
    if (!usedMap.has(norm) && !pendingNormalized.has(norm)) {
      return {
        suggestedDueNo: candidate,
        lastSavedDueNo: seed.lastDueNo,
      };
    }
    val++;
  }
}

/**
 * Finds the next available automatic due number from live data.
 * Format preserves the pattern of the last saved number, or falls back to settings.
 * Skips any number that is already used.
 */
export function getNextFreeAutomaticDueNumber(
  db: AppDatabase,
  pendingRows?: Array<{ id?: string; dueNo?: string }>,
  _startOffset: number = 0
): { dueNumber: string; dueNo: string; counterUsed: number; lastSavedDueNo: string | null } {
  const res = getNextSuggestedDueNumber(db, pendingRows);
  const numMatch = res.suggestedDueNo.match(/\d+/);
  const counterVal = numMatch ? parseInt(numMatch[0], 10) : 1;

  return {
    dueNumber: res.suggestedDueNo,
    dueNo: res.suggestedDueNo,
    counterUsed: counterVal,
    lastSavedDueNo: res.lastSavedDueNo,
  };
}

/**
 * Generates consecutive suggested due numbers for a set of rows.
 * Reads next free number from live data without consuming or advancing the DB counter.
 * Preserves any manual numbers typed by the owner (marked isManualDueNo) and numbers already saved.
 * When an unsaved row is deleted, recomputes suggestions for remaining unsaved rows so numbers stay contiguous.
 */
export function syncDueNumberSuggestions<T extends {
  id: string;
  dueNo?: string;
  isManualDueNo?: boolean;
  isSavedToLedger?: boolean;
  [key: string]: any;
}>(
  rows: T[],
  db: AppDatabase,
  options?: {
    excludeSheetId?: string;
  }
): T[] {
  const usedMap = getAllUsedDueNumbers(db, { excludeSheetId: options?.excludeSheetId });

  // Track numbers that are manually typed or already saved to ledger in this batch
  const reservedInBatch = new Set<string>();
  for (const r of rows) {
    if (r.dueNo && (r.isManualDueNo || r.isSavedToLedger)) {
      const norm = normalizeDueNumber(r.dueNo);
      if (norm) reservedInBatch.add(norm);
    }
  }

  const seed = getNextDueNumberSeed(db);
  let val = seed.nextValue;

  const getNextSuggestion = (): string => {
    while (true) {
      const candidate = formatLikeDuePattern(val, seed.pattern);
      const norm = normalizeDueNumber(candidate);
      if (!usedMap.has(norm) && !reservedInBatch.has(norm)) {
        reservedInBatch.add(norm);
        val++;
        return candidate;
      }
      val++;
    }
  };

  return rows.map((r) => {
    // If the owner typed his own number or it is already saved, NEVER overwrite it!
    if (r.isManualDueNo || r.isSavedToLedger) {
      return r;
    }
    // Pre-fill suggested number
    const suggestion = getNextSuggestion();
    return {
      ...r,
      dueNo: suggestion,
      isManualDueNo: false,
    };
  });
}

/**
 * Calculates the next global sequential due number from database and any pending newly assigned numbers in the current batch.
 * (Retained for backwards compatibility)
 */
export function calculateNextDueNumber(
  existingDueNumbers: string[],
  offsetIndex: number = 0
): string {
  let maxNum = 0;
  for (const no of existingDueNumbers) {
    if (!no) continue;
    const eng = toEnglishDigits(no);
    const m = eng.match(/\d+/);
    if (m) {
      const val = parseInt(m[0], 10);
      if (!isNaN(val) && val > maxNum) {
        maxNum = val;
      }
    }
  }
  const nextNum = maxNum + 1 + offsetIndex;
  return `DUE-${nextNum.toString().padStart(6, '0')}`;
}

/**
 * Extracts key area words from route string (e.g. 'চকবাজার', 'বেগম বাজার', etc.)
 */
export function getRouteKeywords(route: string): string[] {
  if (!route) return [];
  const clean = route
    .replace(/^রুট\s*[\d০-৯\w]+[:\s\-]*/i, '')
    .replace(/^Route\s*[\d০-৯\w]+[:\s\-]*/i, '');
  return clean
    .split(/[\s,;&|/ও+]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2 && w !== 'বাজার' && w !== 'রোড' && w !== 'রুট');
}

/**
 * Returns all configured & known routes across customRoutes, SR territories, and daily sheets.
 */
export function getAvailableRoutes(db: AppDatabase): string[] {
  const baseRoutes =
    db.settings?.customRoutes !== undefined && Array.isArray(db.settings.customRoutes)
      ? db.settings.customRoutes
      : DEFAULT_ROUTES;
  const srRoutes = (db.salesRepresentatives || [])
    .map((sr) => sr.territory)
    .filter((t): t is string => Boolean(t && t.trim()));
  const sheetRoutes = (db.dailySheets || [])
    .map((s) => s.routeOrVan)
    .filter((r): r is string => Boolean(r && r.trim()));
  return Array.from(new Set([...baseRoutes, ...srRoutes, ...sheetRoutes]));
}

/**
 * Builds authoritative map of Customer ID -> Set of associated route names.
 * Matches exact logic from DueModule.
 */
export function getCustomerRouteMap(
  db: AppDatabase,
  providedRoutes?: string[]
): Map<string, Set<string>> {
  const availableRoutes = providedRoutes || getAvailableRoutes(db);
  const map = new Map<string, Set<string>>();

  const addRouteToCustomer = (custId: string, route: string) => {
    if (!custId || !route) return;
    const trimmed = route.trim();
    if (!trimmed) return;
    let set = map.get(custId);
    if (!set) {
      set = new Set<string>();
      map.set(custId, set);
    }
    set.add(trimmed);
  };

  // 1. From past daily sheets
  (db.dailySheets || []).forEach((sheet) => {
    const sheetRoute = sheet.routeOrVan?.trim();
    if (!sheetRoute) return;

    (sheet.todayDueEntries || []).forEach((entry) => {
      if (entry.customerId) {
        addRouteToCustomer(entry.customerId, sheetRoute);
      } else {
        const matched = (db.customers || []).find(
          (c) =>
            (entry.shopName && c.shopName.toLowerCase() === entry.shopName.toLowerCase()) ||
            (entry.customerName && c.name.toLowerCase() === entry.customerName.toLowerCase())
        );
        if (matched) addRouteToCustomer(matched.id, sheetRoute);
      }
    });

    (sheet.dueCollectionEntries || []).forEach((entry) => {
      if (entry.customerId) {
        addRouteToCustomer(entry.customerId, sheetRoute);
      } else {
        const matched = (db.customers || []).find(
          (c) =>
            (entry.shopName && c.shopName.toLowerCase() === entry.shopName.toLowerCase()) ||
            (entry.customerName && c.name.toLowerCase() === entry.customerName.toLowerCase())
        );
        if (matched) addRouteToCustomer(matched.id, sheetRoute);
      }
    });
  });

  // 2. From customer ledgers
  (db.customerLedgers || []).forEach((entry) => {
    if (!entry.customerId || !entry.description) return;
    const desc = entry.description;
    availableRoutes.forEach((route) => {
      if (desc.includes(route)) {
        addRouteToCustomer(entry.customerId, route);
      }
    });
  });

  // 3. Keyword and name matching in customer's address, shopName, notes, or assigned SR territory
  const routeKeywordMap = availableRoutes.map((r) => ({
    route: r,
    lowerRoute: r.toLowerCase(),
    keywords: getRouteKeywords(r),
  }));

  (db.customers || []).forEach((c) => {
    const addr = (c.address || '').toLowerCase();
    const shop = (c.shopName || '').toLowerCase();
    const notes = (c.notes || '').toLowerCase();

    routeKeywordMap.forEach(({ route, lowerRoute, keywords }) => {
      if (addr.includes(lowerRoute) || shop.includes(lowerRoute) || notes.includes(lowerRoute)) {
        addRouteToCustomer(c.id, route);
      } else if (keywords.length > 0) {
        const match = keywords.some(
          (kw) => addr.includes(kw) || shop.includes(kw) || notes.includes(kw)
        );
        if (match) {
          addRouteToCustomer(c.id, route);
        }
      }
    });

    // 4. From customer's assigned SR territory
    if (c.assignedSrId) {
      const sr = (db.salesRepresentatives || []).find((s) => s.id === c.assignedSrId);
      if (sr && sr.territory) {
        const terr = sr.territory.trim();
        if (terr) {
          const matchedRoute = availableRoutes.find(
            (r) =>
              r.toLowerCase() === terr.toLowerCase() ||
              terr.toLowerCase().includes(r.toLowerCase()) ||
              r.toLowerCase().includes(terr.toLowerCase())
          );
          if (matchedRoute) {
            addRouteToCustomer(c.id, matchedRoute);
          } else {
            addRouteToCustomer(c.id, terr);
          }
        }
      }
    }
  });

  // 5. Authoritative customer.route assignment
  (db.customers || []).forEach((c) => {
    if (c.route !== undefined) {
      if (c.route.trim()) {
        map.set(c.id, new Set([c.route.trim()]));
      } else {
        map.set(c.id, new Set());
      }
    }
  });

  return map;
}

export interface RouteDueItem {
  id: string;
  dueNo: string;
  rawDueNo: string;
  customerId: string;
  customerName: string; // e.g. "শিশু পাক, শেরপুর"
  shopName: string;
  amount: number; // remaining outstanding amount after collections
  date?: string;
}

/**
 * Returns all active, outstanding dues for a selected route with their remaining balances.
 * Fully paid dues are hidden. Partly collected dues show only remaining amount.
 * The total amount equals the route total on the বাকি page.
 */
export function getRouteOutstandingDues(
  db: AppDatabase,
  selectedRoute: string,
  routeMap?: Map<string, Set<string>>
): {
  dues: RouteDueItem[];
  customerCount: number;
  totalAmount: number;
} {
  if (!selectedRoute) {
    return { dues: [], customerCount: 0, totalAmount: 0 };
  }

  const customerRouteMap = routeMap || getCustomerRouteMap(db);

  // 1. Get all active customers with outstanding due on this route
  const targetCustomers = (db.customers || []).filter((c) => {
    if (c.status === 'inactive') return false;
    const due = Number(c.currentDue) || 0;
    if (due <= 0) return false;

    const routes = customerRouteMap.get(c.id);
    if (selectedRoute === 'no_route') {
      return !routes || routes.size === 0;
    }
    return routes ? routes.has(selectedRoute) : false;
  });

  const dues: RouteDueItem[] = [];

  for (const cust of targetCustomers) {
    const custDue = Number(cust.currentDue) || 0;
    if (custDue <= 0) continue;

    // Formatted name: "দোকানের নাম, কাস্টমারের নাম" or e.g. "শিশু পাক, শেরপুর"
    let formattedName = cust.shopName?.trim() || cust.name?.trim() || 'কাস্টমার';
    if (cust.shopName && cust.name && cust.shopName.trim() !== cust.name.trim()) {
      formattedName = `${cust.shopName.trim()}, ${cust.name.trim()}`;
    } else if (cust.shopName && cust.address) {
      const cleanAddr = cust.address.split(',')[0].trim();
      if (cleanAddr && !cust.shopName.includes(cleanAddr)) {
        formattedName = `${cust.shopName.trim()}, ${cleanAddr}`;
      }
    }

    // Customer debit ledger entries (dues): debit > 0, active (not voided or settled)
    const debitEntries = (db.customerLedgers || []).filter(
      (l) =>
        l.customerId === cust.id &&
        Number(l.debit) > 0 &&
        l.status !== 'voided' &&
        l.status !== 'settled'
    );

    // Customer credit ledger entries (collections/returns): credit > 0, not voided
    const creditEntries = (db.customerLedgers || []).filter(
      (l) => l.customerId === cust.id && Number(l.credit) > 0 && l.status !== 'voided'
    );

    if (debitEntries.length === 0) {
      // Customer has currentDue > 0 but no separate debit ledger entries (e.g. initial opening balance)
      let primaryDueNo = '';
      const sheetDue = (db.dailySheets || [])
        .flatMap((s) => s.todayDueEntries || [])
        .find((e) => e.customerId === cust.id && e.dueNo);
      if (sheetDue && sheetDue.dueNo) {
        primaryDueNo = sheetDue.dueNo;
      } else if (cust.openingBalance && cust.openingBalance > 0) {
        primaryDueNo = 'OPENING';
      }

      dues.push({
        id: `cust-${cust.id}`,
        dueNo: formatDueNumber(primaryDueNo) || '—',
        rawDueNo: primaryDueNo,
        customerId: cust.id,
        customerName: formattedName,
        shopName: cust.shopName || cust.name,
        amount: custDue,
        date: cust.createdAt ? cust.createdAt.split('T')[0] : undefined,
      });
      continue;
    }

    // Sort debit entries chronologically (oldest first)
    const sortedDebits = [...debitEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Track remaining amount on each debit entry
    const debitTrackers = sortedDebits.map((d) => ({
      entry: d,
      dueNo:
        d.dueNo ||
        (d.referenceId && d.referenceId.startsWith('DUE-')
          ? d.referenceId
          : d.referenceId && /^\d+$/.test(d.referenceId)
          ? d.referenceId
          : ''),
      rawRef: d.referenceId || '',
      remaining: Number(d.debit) || 0,
    }));

    // Apply targeted credits first (payments that reference a specific dueNo)
    let generalCredits = 0;
    for (const cred of creditEntries) {
      const credAmt = Number(cred.credit) || 0;
      if (credAmt <= 0) continue;

      const normRef = normalizeDueNumber(cred.referenceId);
      const targetDebit = normRef
        ? debitTrackers.find(
            (t) =>
              (t.dueNo && normalizeDueNumber(t.dueNo) === normRef) ||
              (t.rawRef && normalizeDueNumber(t.rawRef) === normRef)
          )
        : null;

      if (targetDebit && targetDebit.remaining > 0) {
        const deduction = Math.min(targetDebit.remaining, credAmt);
        targetDebit.remaining -= deduction;
        const leftover = credAmt - deduction;
        if (leftover > 0) {
          generalCredits += leftover;
        }
      } else {
        generalCredits += credAmt;
      }
    }

    // Apply remaining general credits in FIFO order across debit entries
    if (generalCredits > 0) {
      for (const tracker of debitTrackers) {
        if (tracker.remaining > 0) {
          const deduction = Math.min(tracker.remaining, generalCredits);
          tracker.remaining -= deduction;
          generalCredits -= deduction;
          if (generalCredits <= 0) break;
        }
      }
    }

    // Active debits with remaining > 0
    let activeTrackers = debitTrackers.filter((t) => t.remaining > 0);

    // Guarantee that sum(activeTrackers.remaining) matches cust.currentDue exactly
    const calculatedSum = activeTrackers.reduce((s, t) => s + t.remaining, 0);

    if (activeTrackers.length === 0 && custDue > 0) {
      // If all were reduced to 0 by credits, but customer still has currentDue
      const lastDebit = debitTrackers[debitTrackers.length - 1];
      activeTrackers = [
        {
          entry: lastDebit.entry,
          dueNo: lastDebit.dueNo,
          rawRef: lastDebit.rawRef,
          remaining: custDue,
        },
      ];
    } else if (calculatedSum !== custDue && activeTrackers.length > 0) {
      const diff = custDue - calculatedSum;
      if (diff > 0) {
        activeTrackers[activeTrackers.length - 1].remaining += diff;
      } else if (diff < 0) {
        let excessToSubtract = -diff;
        for (const tracker of activeTrackers) {
          if (tracker.remaining > 0) {
            const deduct = Math.min(tracker.remaining, excessToSubtract);
            tracker.remaining -= deduct;
            excessToSubtract -= deduct;
            if (excessToSubtract <= 0) break;
          }
        }
        activeTrackers = activeTrackers.filter((t) => t.remaining > 0);
      }
    }

    // Add each active remaining due to the dues list
    for (const tracker of activeTrackers) {
      if (tracker.remaining <= 0) continue; // fully paid dues are hidden!

      const dueNoStr = tracker.dueNo || tracker.rawRef;
      dues.push({
        id: tracker.entry.id,
        dueNo: formatDueNumber(dueNoStr) || '—',
        rawDueNo: dueNoStr,
        customerId: cust.id,
        customerName: formattedName,
        shopName: cust.shopName || cust.name,
        amount: tracker.remaining,
        date: tracker.entry.date,
      });
    }
  }

  const totalAmount = dues.reduce((sum, d) => sum + d.amount, 0);
  const uniqueCustomerIds = new Set(dues.map((d) => d.customerId));

  return {
    dues,
    customerCount: uniqueCustomerIds.size,
    totalAmount,
  };
}

/**
 * Retrieves all distinct due numbers for a customer.
 * - includePaid: if false (default), excludes fully paid dues. If true, includes all dues.
 * - Sorts due numbers in ASCENDING order (e.g. 501, 540).
 * - The last due number in the array is the LARGEST due number!
 */
export function getCustomerDueNumbersInfo(
  customerId: string,
  db: AppDatabase,
  includePaid: boolean = false
): {
  dueNos: string[];
  lastDueNo: string | null;
  oldestDate?: string | null;
  outstandingCount?: number;
} {
  if (!customerId) {
    return { dueNos: [], lastDueNo: null, oldestDate: null, outstandingCount: 0 };
  }

  // 1. Collect from customerLedgers
  const debitTrackers: Array<{ dueNo: string; remaining: number }> = [];
  const creditEntries: Array<{ referenceId?: string; credit: number }> = [];

  if (Array.isArray(db.customerLedgers)) {
    for (const l of db.customerLedgers) {
      if (l.customerId !== customerId || l.status === 'voided') continue;

      if (Number(l.debit) > 0) {
        const no =
          l.dueNo ||
          (l.referenceId && (l.referenceId.startsWith('DUE-') || /^[A-Za-z0-9\-_]+$/.test(l.referenceId))
            ? l.referenceId
            : '');
        if (no) {
          debitTrackers.push({
            dueNo: no,
            remaining: l.status === 'settled' ? 0 : Number(l.debit) || 0,
          });
        }
      } else if (Number(l.credit) > 0) {
        creditEntries.push({
          referenceId: l.referenceId,
          credit: Number(l.credit) || 0,
        });
      }
    }
  }

  // Deduct targeted credits
  let generalCredits = 0;
  for (const cred of creditEntries) {
    if (cred.credit <= 0) continue;
    const normRef = normalizeDueNumber(cred.referenceId);
    const target = normRef
      ? debitTrackers.find((t) => normalizeDueNumber(t.dueNo) === normRef)
      : null;

    if (target && target.remaining > 0) {
      const deduction = Math.min(target.remaining, cred.credit);
      target.remaining -= deduction;
      const leftover = cred.credit - deduction;
      if (leftover > 0) generalCredits += leftover;
    } else {
      generalCredits += cred.credit;
    }
  }

  // Deduct FIFO general credits
  if (generalCredits > 0) {
    for (const t of debitTrackers) {
      if (t.remaining > 0) {
        const deduction = Math.min(t.remaining, generalCredits);
        t.remaining -= deduction;
        generalCredits -= deduction;
        if (generalCredits <= 0) break;
      }
    }
  }

  // 2. Also check dailySheets (todayDueEntries) for unsynced or initial entries
  if (Array.isArray(db.dailySheets)) {
    for (const s of db.dailySheets) {
      for (const e of s.todayDueEntries || []) {
        if (e.customerId === customerId && e.dueNo) {
          const norm = normalizeDueNumber(e.dueNo);
          const already = debitTrackers.some((t) => normalizeDueNumber(t.dueNo) === norm);
          if (!already) {
            debitTrackers.push({
              dueNo: e.dueNo,
              remaining: Number(e.amount) || 0,
            });
          }
        }
      }
    }
  }

  // Filter based on includePaid
  const activeList = includePaid
    ? debitTrackers
    : debitTrackers.filter((t) => t.remaining > 0);

  // Distinct due numbers and track their dates
  const seenNorm = new Set<string>();
  const distinctDueNos: string[] = [];
  const activeDates: string[] = [];

  for (const item of activeList) {
    const norm = normalizeDueNumber(item.dueNo);
    if (norm && !seenNorm.has(norm)) {
      seenNorm.add(norm);
      distinctDueNos.push(item.dueNo);
    }
  }

  // Find dates for active outstanding dues
  if (Array.isArray(db.customerLedgers)) {
    for (const l of db.customerLedgers) {
      if (l.customerId !== customerId || l.status === 'voided') continue;
      if (Number(l.debit) > 0 && l.date) {
        const no = l.dueNo || l.referenceId || '';
        const norm = normalizeDueNumber(no);
        if (norm && seenNorm.has(norm)) {
          activeDates.push(l.date);
        }
      }
    }
  }
  if (Array.isArray(db.dailySheets)) {
    for (const s of db.dailySheets) {
      for (const e of s.todayDueEntries || []) {
        if (e.customerId === customerId && e.dueNo && s.date) {
          const norm = normalizeDueNumber(e.dueNo);
          if (norm && seenNorm.has(norm)) {
            activeDates.push(s.date);
          }
        }
      }
    }
  }

  // Sort distinct numbers in ASCENDING order using natural comparison
  distinctDueNos.sort(naturalCompareDueNumbers);

  // Oldest date (earliest date) among outstanding dues
  activeDates.sort((a, b) => a.localeCompare(b));
  const oldestDate = activeDates.length > 0 ? activeDates[0] : null;

  const lastDueNo = distinctDueNos.length > 0 ? distinctDueNos[distinctDueNos.length - 1] : null;

  return {
    dueNos: distinctDueNos,
    lastDueNo,
    oldestDate,
    outstandingCount: distinctDueNos.length,
  };
}

/**
 * Compares two customers by their LAST (largest) due number in ascending order.
 * Example: Customer A (501, 540) has last 540; Customer B (502) has 502; Customer C (539) has 539.
 * Sorting order: B (502), C (539), A (540).
 */
export function compareCustomersByLastDueNumber(
  custAId: string,
  custBId: string,
  db: AppDatabase,
  includePaid: boolean = false
): number {
  const infoA = getCustomerDueNumbersInfo(custAId, db, includePaid);
  const infoB = getCustomerDueNumbersInfo(custBId, db, includePaid);

  if (infoA.lastDueNo && infoB.lastDueNo) {
    const comp = naturalCompareDueNumbers(infoA.lastDueNo, infoB.lastDueNo);
    if (comp !== 0) return comp;
  } else if (infoA.lastDueNo && !infoB.lastDueNo) {
    return -1;
  } else if (!infoA.lastDueNo && infoB.lastDueNo) {
    return 1;
  }

  return 0;
}

/**
 * Sorts route dues:
 * - 'dueNo':
 *   - If groupByCustomer is true (default): orders customers by their LAST (largest) due number ascending,
 *     keeping multiple dues for the same customer together!
 *   - If groupByCustomer is false: plain natural numeric order of each due.
 * - 'name': by customer name, keeping multiple dues for the same customer together.
 * - 'amount': by amount descending.
 */
export function sortRouteDues(
  dues: RouteDueItem[],
  sortOrder: 'name' | 'dueNo' | 'amount' = 'name',
  options?: {
    groupByCustomer?: boolean;
    customerLastDueMap?: Map<string, string>;
  }
): RouteDueItem[] {
  const copy = [...dues];
  const groupByCust = options?.groupByCustomer ?? true;

  if (sortOrder === 'name') {
    return copy.sort((a, b) => {
      const nameComp = (a.customerName || '').localeCompare(b.customerName || '', 'bn');
      if (nameComp !== 0) return nameComp;
      return naturalCompareDueNumbers(a.dueNo, b.dueNo);
    });
  } else if (sortOrder === 'dueNo') {
    if (!groupByCust) {
      // Pure per-due plain numeric order
      return copy.sort((a, b) => naturalCompareDueNumbers(a.rawDueNo || a.dueNo, b.rawDueNo || b.dueNo));
    }

    // Customer-wise order uses the LAST (largest) number of that customer in the list!
    const custLastDueMap = options?.customerLastDueMap || new Map<string, string>();
    if (!options?.customerLastDueMap) {
      dues.forEach((d) => {
        const currentLast = custLastDueMap.get(d.customerId);
        if (!currentLast) {
          custLastDueMap.set(d.customerId, d.rawDueNo || d.dueNo);
        } else if (naturalCompareDueNumbers(d.rawDueNo || d.dueNo, currentLast) > 0) {
          custLastDueMap.set(d.customerId, d.rawDueNo || d.dueNo);
        }
      });
    }

    return copy.sort((a, b) => {
      if (a.customerId !== b.customerId) {
        const lastA = custLastDueMap.get(a.customerId) || a.rawDueNo || a.dueNo;
        const lastB = custLastDueMap.get(b.customerId) || b.rawDueNo || b.dueNo;
        const comp = naturalCompareDueNumbers(lastA, lastB);
        if (comp !== 0) return comp;
      }
      return naturalCompareDueNumbers(a.rawDueNo || a.dueNo, b.rawDueNo || b.dueNo);
    });
  } else if (sortOrder === 'amount') {
    return copy.sort((a, b) => b.amount - a.amount);
  }
  return copy;
}

