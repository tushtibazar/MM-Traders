import { toBengaliDigits } from './dateUtils';
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
 * Formats a due number cleanly with Bengali digits, e.g. "DUE-0005" -> "DUE-০০০৫" or "০০০৫"
 * If input is "0005" or "DUE-0005" or "5", returns consistent format "DUE-০০০৫"
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
  const numVal = parseInt(match[0], 10);
  if (isNaN(numVal)) return clean;
  
  const padded = numVal.toString().padStart(4, '0');
  return `DUE-${toBengaliDigits(padded)}`;
}

/**
 * Short representation (e.g. ০০০৫)
 */
export function formatShortDueNumber(dueNo?: string | null): string {
  if (!dueNo || !dueNo.trim()) return '';
  const clean = dueNo.trim();
  const english = toEnglishDigits(clean);
  const match = english.match(/\d+/);
  if (!match) return clean;
  const numVal = parseInt(match[0], 10);
  if (isNaN(numVal)) return clean;
  const padded = numVal.toString().padStart(4, '0');
  return toBengaliDigits(padded);
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
  if (normalizedTarget.includes(normalizedSearch)) return true;
  
  return false;
}

/**
 * Calculates the next global sequential due number from database and any pending newly assigned numbers in the current batch.
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
