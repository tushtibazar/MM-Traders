import { Expense, DailyAccountSheet, AppDatabase } from '../types';

export interface ExpenseDuplicateReport {
  duplicateCount: number;
  duplicateAmount: number;
  duplicateIds: string[];
  duplicateEntries: Expense[];
}

/**
 * Checks whether an expense entry is auto-synced from a Daily হিসাব sheet.
 * Manual expenses created by the owner have standard categories (e.g. দোকান ভাড়া, বিদ্যুৎ বিল, আপ্যায়ন)
 * and do not have sheetId or Daily হিসাব prefixes.
 */
export function isAutoSheetExpense(e: Expense): boolean {
  if (e.sheetId) return true;
  if (typeof e.id === 'string' && e.id.startsWith('exp-sheet-')) return true;
  if (
    e.category === 'মার্কেট খরচ (Daily হিসাব)' ||
    e.category === 'মার্কেট খরচ (Daily Sheet)'
  ) {
    return true;
  }
  if (
    typeof e.description === 'string' &&
    e.description.includes('Daily হিসাব খরচ')
  ) {
    return true;
  }
  if (
    typeof e.note === 'string' &&
    e.note.includes('Daily হিসাব থেকে স্বয়ংক্রিয়')
  ) {
    return true;
  }
  return false;
}

/**
 * Detects duplicate or orphaned auto-created Daily হিসাব expense entries in db.expenses.
 * Preserves exactly one valid entry per Daily হিসাব sheet that has marketExpense > 0.
 * NEVER touches manually created expenses.
 */
export function detectDuplicateExpenses(
  expenses: Expense[] = [],
  dailySheets: DailyAccountSheet[] = []
): ExpenseDuplicateReport {
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeSheets = Array.isArray(dailySheets) ? dailySheets : [];

  const sheetsById = new Map<string, DailyAccountSheet>();
  safeSheets.forEach((s) => {
    if (s.id) sheetsById.set(s.id, s);
  });

  // Find linked sheet for an expense entry
  const findLinkedSheet = (e: Expense): DailyAccountSheet | undefined => {
    if (e.sheetId && sheetsById.has(e.sheetId)) {
      return sheetsById.get(e.sheetId);
    }
    if (typeof e.id === 'string' && e.id.startsWith('exp-sheet-')) {
      const rawId = e.id.replace('exp-sheet-', '');
      if (sheetsById.has(rawId)) return sheetsById.get(rawId);
    }
    if (e.referenceId && sheetsById.has(e.referenceId)) {
      return sheetsById.get(e.referenceId);
    }
    // Match by date and sheetNo or route
    return safeSheets.find((s) => {
      if (s.date !== e.date) return false;
      if (s.sheetNo && (e.referenceId === s.sheetNo || e.description?.includes(s.sheetNo))) {
        return true;
      }
      if (s.routeOrVan && e.description?.includes(s.routeOrVan)) {
        return true;
      }
      return false;
    });
  };

  // Group auto-synced expenses by sheet
  const sheetGroups = new Map<string, Expense[]>();
  const orphanedAutoExpenses: Expense[] = [];

  safeExpenses.forEach((e) => {
    // Voided entries or manual expenses are never treated as duplicates
    if (e.status === 'void') return;
    if (!isAutoSheetExpense(e)) return;

    const sheet = findLinkedSheet(e);

    // If linked sheet exists but its marketExpense is 0, any auto-expense for it is an orphan
    if (sheet && (Number(sheet.marketExpense) || 0) === 0) {
      orphanedAutoExpenses.push(e);
      return;
    }

    // If no matching sheet exists at all in dailySheets, this is an orphan from a deleted sheet
    if (!sheet) {
      orphanedAutoExpenses.push(e);
      return;
    }

    const groupKey = sheet.id;
    const list = sheetGroups.get(groupKey) || [];
    list.push(e);
    sheetGroups.set(groupKey, list);
  });

  const duplicateEntries: Expense[] = [...orphanedAutoExpenses];

  // For sheets that have multiple auto-synced entries, pick the single best one to KEEP,
  // and mark the rest as duplicates to be removed
  sheetGroups.forEach((list, sheetId) => {
    if (list.length > 1) {
      const sheet = sheetsById.get(sheetId);
      const targetAmount = sheet ? Number(sheet.marketExpense) || 0 : 0;

      // Sort so the preferred entry is at index 0:
      // 1. Exactly matches the sheet's current marketExpense
      // 2. Has the canonical id 'exp-sheet-${sheetId}'
      // 3. Most recently created
      list.sort((a, b) => {
        const aMatchesAmt = targetAmount > 0 && Number(a.amount) === targetAmount ? 1 : 0;
        const bMatchesAmt = targetAmount > 0 && Number(b.amount) === targetAmount ? 1 : 0;
        if (aMatchesAmt !== bMatchesAmt) return bMatchesAmt - aMatchesAmt;

        const aIsCanonicalId = a.id === `exp-sheet-${sheetId}` ? 1 : 0;
        const bIsCanonicalId = b.id === `exp-sheet-${sheetId}` ? 1 : 0;
        if (aIsCanonicalId !== bIsCanonicalId) return bIsCanonicalId - aIsCanonicalId;

        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      // Keep list[0], mark all subsequent as duplicates
      for (let i = 1; i < list.length; i++) {
        duplicateEntries.push(list[i]);
      }
    }
  });

  const duplicateCount = duplicateEntries.length;
  const duplicateAmount = duplicateEntries.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  const duplicateIds = duplicateEntries.map((e) => e.id);

  return {
    duplicateCount,
    duplicateAmount,
    duplicateIds,
    duplicateEntries,
  };
}

/**
 * Safely removes duplicate expense records from db.
 * Takes an internal safety snapshot to localStorage before making any changes.
 */
export function cleanupDuplicateExpenses(
  db: AppDatabase
): { updatedDb: AppDatabase; removedCount: number; removedAmount: number } {
  const report = detectDuplicateExpenses(db.expenses, db.dailySheets);
  if (report.duplicateCount === 0) {
    return { updatedDb: db, removedCount: 0, removedAmount: 0 };
  }

  // 1. Take safety snapshot in localStorage
  try {
    const snapshotKey = 'mm_traders_pre_expense_cleanup_backup';
    localStorage.setItem(snapshotKey, JSON.stringify(db));
    localStorage.setItem(
      `${snapshotKey}_meta`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        removedCount: report.duplicateCount,
        removedAmount: report.duplicateAmount,
      })
    );
  } catch (err) {
    console.warn('Could not store pre-cleanup backup in localStorage:', err);
  }

  // 2. Remove duplicate IDs from db.expenses
  const dupIdSet = new Set(report.duplicateIds);
  const cleanExpenses = (db.expenses || []).filter((e) => !dupIdSet.has(e.id));

  const updatedDb: AppDatabase = {
    ...db,
    expenses: cleanExpenses,
    lastUpdated: new Date().toISOString(),
  };

  return {
    updatedDb,
    removedCount: report.duplicateCount,
    removedAmount: report.duplicateAmount,
  };
}
