const SPACE = ' ';

/**
 * Utility function to get the word at the cursor position in a text input.
 */
export const getCursorWord = (
  inputValue: string | number,
  cursorPosition: number | null = 0,
): { word: string; cursorStart: number; cursorEnd: number } => {
  const value = typeof inputValue === 'string' ? inputValue : String(inputValue);
  const cursor = cursorPosition ?? 0;

  // Find the start of the word (scan left from cursor)
  let wordStart = Math.max(cursor, 0);
  while (wordStart > 0 && value[wordStart - 1] !== SPACE) {
    wordStart--;
  }

  // Find the end of the word (scan right from cursor)
  let wordEnd = Math.min(cursor, value.length);
  while (wordEnd < value.length && value[wordEnd] !== SPACE) {
    wordEnd++;
  }

  const word = value.slice(wordStart, wordEnd).trim();

  return { word, cursorStart: wordStart, cursorEnd: wordEnd };
};
