import { toBengaliDigits, formatDate } from './dateUtils';
import type { AppDatabase } from '../types';

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
 * Finds the next available automatic due number from db.settings.nextDueNumberCounter.
 * Format: "DUE-000123" (prefix DUE-, 6 digits).
 * Skips any number that is already used (manually typed, in ledgers, sheets, or audit trail).
 */
export function getNextFreeAutomaticDueNumber(
  db: AppDatabase,
  pendingRows?: Array<{ id?: string; dueNo?: string }>,
  startOffset: number = 0
): { dueNumber: string; dueNo: string; counterUsed: number } {
  const usedMap = getAllUsedDueNumbers(db);
  
  // Also collect pending rows in batch
  const pendingNormalized = new Set<string>();
  if (pendingRows) {
    for (const r of pendingRows) {
      if (r.dueNo) {
        const norm = normalizeDueNumber(r.dueNo);
        if (norm) pendingNormalized.add(norm);
      }
    }
  }

  let counter = db.settings?.nextDueNumberCounter && db.settings.nextDueNumberCounter >= 1
    ? db.settings.nextDueNumberCounter + startOffset
    : 1 + startOffset;

  // Search forward for first unused number
  while (true) {
    const candidateStr = `DUE-${counter.toString().padStart(6, '0')}`;
    const norm = normalizeDueNumber(candidateStr);
    if (!usedMap.has(norm) && !pendingNormalized.has(norm)) {
      return {
        dueNumber: candidateStr,
        dueNo: candidateStr,
        counterUsed: counter,
      };
    }
    counter++;
  }
}

/**
 * Generates consecutive 6-digit suggested due numbers ("DUE-000123") for a set of rows.
 * Reads next free number without consuming or advancing the DB counter.
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
  // Collect occupied numbers in DB (excluding this sheet)
  const usedMap = getAllUsedDueNumbers(db, { excludeSheetId: options?.excludeSheetId });
  
  // Track numbers that are manually typed or already saved to ledger in this batch
  const reservedInBatch = new Set<string>();
  for (const r of rows) {
    if (r.dueNo && (r.isManualDueNo || r.isSavedToLedger)) {
      const norm = normalizeDueNumber(r.dueNo);
      if (norm) reservedInBatch.add(norm);
    }
  }

  let counter = db.settings?.nextDueNumberCounter && db.settings.nextDueNumberCounter >= 1
    ? db.settings.nextDueNumberCounter
    : 1;

  const getNextSuggestion = (): string => {
    while (true) {
      const candidate = `DUE-${counter.toString().padStart(6, '0')}`;
      const norm = normalizeDueNumber(candidate);
      if (!usedMap.has(norm) && !reservedInBatch.has(norm)) {
        reservedInBatch.add(norm);
        counter++;
        return candidate;
      }
      counter++;
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
