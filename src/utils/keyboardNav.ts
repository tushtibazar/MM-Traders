/**
 * Keyboard Navigation & Numeric Input Utilities
 * Eliminates spinner arrows, accidental mouse-wheel adjustments, and enables spreadsheet-style arrow navigation.
 */

/**
 * Checks if the text cursor inside an input element is at the very beginning (index 0).
 */
export const isCursorAtStart = (el: HTMLInputElement | null): boolean => {
  if (!el) return true;
  try {
    return el.selectionStart === 0 && el.selectionEnd === 0;
  } catch {
    return true;
  }
};

/**
 * Checks if the text cursor inside an input element is at the very end of the text.
 */
export const isCursorAtEnd = (el: HTMLInputElement | null): boolean => {
  if (!el) return true;
  try {
    const len = el.value.length;
    return el.selectionStart === len && el.selectionEnd === len;
  } catch {
    return true;
  }
};

/**
 * Prevents accidental mouse wheel adjustments when scrolling over numeric inputs.
 */
export const preventWheelChange = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

/**
 * Cleans user typed numeric input, accepting digits and at most one decimal point.
 * Works whether typed on hardware keyboard or mobile virtual keyboard.
 */
export const sanitizeDecimalInput = (raw: string): string => {
  if (!raw) return '';
  // Keep only digits and decimal point
  let cleaned = raw.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
};

/**
 * Cleans user typed integer input, accepting only digits 0-9.
 */
export const sanitizeIntegerInput = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
};
