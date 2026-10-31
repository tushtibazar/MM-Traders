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
 * If purely numeric, removes leading zeros (e.g. "0125" -> "125", "DUE-0125" -> "125").
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
 * Formats a due number cleanly with Bengali digits, e.g. "DUE-0005" -> "DUE-০০০৫" or "০০০৫"
 * If input is alphanumeric like "A-45", keeps "A-45"
 */
export function formatDueNumber(dueNo?: string | null): string {
  if (!dueNo || !dueNo.trim()) return '';
  const clean = dueNo.trim();
  
  // Extract number part
  const english = toEnglishDigits(clean);
  const match = english.match(/\d+/);
  if (!match) {
    return clean;
  }
  // If it starts with DUE- or is purely digits
  if (/^DUE-\d+$/i.test(english) || /^\d+$/.test(english)) {
    const numVal = parseInt(match[0], 10);
    if (!isNaN(numVal)) {
      const padded = numVal.toString().padStart(4, '0');
      return `DUE-${toBengaliDigits(padded)}`;
    }
  }
  
  return clean;
}

/**
 * Short representation (e.g. ০০০৫ or A-45)
 */
export function formatShortDueNumber(dueNo?: string | null): string {
  if (!dueNo || !dueNo.trim()) return '';
  const clean = dueNo.trim();
  const english = toEnglishDigits(clean);
  if (/^DUE-\d+$/i.test(english) || /^\d+$/.test(english)) {
    const match = english.match(/\d+/);
    if (match) {
      const numVal = parseInt(match[0], 10);
      if (!isNaN(numVal)) {
        const padded = numVal.toString().padStart(4, '0');
        return toBengaliDigits(padded);
      }
    }
  }
  return clean;
}

/**
 * Checks if a given due number matches the search input query.
 * Flexible: matches English digits, Bengali digits, with or without "DUE-", with or without leading zeros.
 * Example: Search "1", "১", "0001", "০০০১", "DUE-1", "DUE-0001" all match a due with ID 1 / DUE-0001.
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
    
    // Exact integer match (e.g. 1 matches 0001)
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
  customerName?: string;
  date?: string;
  sourceType: 'ledger' | 'sheet' | 'audit_reserved' | 'unsaved_row';
  sourceId?: string;
}

/**
 * Collects all occupied/reserved due numbers across the system
 */
export function getAllUsedDueNumbers(
  db: AppDatabase,
  options?: {
    excludeLedgerId?: string;
    excludeSheetId?: string;
    excludeRowId?: string;
  }
): Map<string, DueNumberUsageInfo> {
  const map = new Map<string, DueNumberUsageInfo>();

  // 1. Customer Ledgers
  if (Array.isArray(db.customerLedgers)) {
    for (const entry of db.customerLedgers) {
      if (options?.excludeLedgerId && entry.id === options.excludeLedgerId) continue;
      const refDueNo = entry.dueNo || (entry.referenceId && (entry.referenceId.startsWith('DUE-') || /^[0-9]+$/.test(entry.referenceId)) ? entry.referenceId : '');
      if (refDueNo) {
        const norm = normalizeDueNumber(refDueNo);
        if (norm && !map.has(norm)) {
          let custName = entry.customerName;
          if (!custName && entry.customerId && Array.isArray(db.customers)) {
            const c = db.customers.find((cust) => cust.id === entry.customerId);
            if (c) custName = c.shopName || c.name;
          }
          map.set(norm, {
            normalized: norm,
            raw: refDueNo,
            customerName: custName,
            date: entry.date,
            sourceType: 'ledger',
            sourceId: entry.id,
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
        if (options?.excludeRowId && row.id === options.excludeRowId) continue;
        if (row.dueNo) {
          const norm = normalizeDueNumber(row.dueNo);
          if (norm && !map.has(norm)) {
            map.set(norm, {
              normalized: norm,
              raw: row.dueNo,
              customerName: row.customerName || row.shopName,
              date: sheet.date,
              sourceType: 'sheet',
              sourceId: row.id || sheet.id,
            });
          }
        }
      }
    }
  }

  // 3. Audit trail (includes voided / deleted due numbers which are reserved)
  if (Array.isArray(db.dueNumberAuditTrail)) {
    for (const trail of db.dueNumberAuditTrail) {
      const candidates = [trail.newDueNo, trail.oldDueNo];
      for (const cand of candidates) {
        if (!cand) continue;
        const norm = normalizeDueNumber(cand);
        if (norm && !map.has(norm)) {
          map.set(norm, {
            normalized: norm,
            raw: cand,
            customerName: trail.customerName,
            date: trail.changedAt ? trail.changedAt.split('T')[0] : (trail.date || undefined),
            sourceType: 'audit_reserved',
            sourceId: trail.id,
          });
        }
      }
    }
  }

  return map;
}

/**
 * Checks if a candidate due number is a duplicate.
 * Checks against database records, reserved audit entries, and current unsaved rows in the UI.
 */
export function findDueNumberDuplicate(
  candidate: string,
  db: AppDatabase,
  options?: {
    excludeLedgerId?: string;
    excludeSheetId?: string;
    excludeRowId?: string;
    currentUnsavedRows?: Array<{ id: string; dueNo?: string; customerName?: string }>;
  }
): { isDuplicate: boolean; message?: string; existingCustomerName?: string; existingDate?: string } {
  const normCandidate = normalizeDueNumber(candidate);
  if (!normCandidate) {
    return { isDuplicate: false };
  }

  // Check unsaved rows in same UI form first
  if (options?.currentUnsavedRows) {
    for (const row of options.currentUnsavedRows) {
      if (options.excludeRowId && row.id === options.excludeRowId) continue;
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
  });

  const existing = usedMap.get(normCandidate);
  if (existing) {
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
 * Finds the next available automatic due number from db.settings.nextDueNumberCounter.
 * Skips any number that is already used (manually typed, in ledgers, sheets, or audit trail).
 * Counter is strictly maintained and incremented to ensure collision-free sequential numbers.
 */
export function getNextFreeAutomaticDueNumber(
  db: AppDatabase,
  pendingRows?: Array<{ id?: string; dueNo?: string }>
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
    ? db.settings.nextDueNumberCounter
    : 1;

  // Search forward for first unused number
  while (true) {
    const candidateStr = `DUE-${counter.toString().padStart(4, '0')}`;
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
  return `DUE-${nextNum.toString().padStart(4, '0')}`;
}

