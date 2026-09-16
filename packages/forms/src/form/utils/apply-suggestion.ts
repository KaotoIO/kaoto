import { Suggestion } from '../models/suggestions';
import { getCursorWord } from './get-cursor-word';

export const applySuggestion = (
  suggestion: Suggestion,
  inputValue: string | number,
  cursorPosition?: number | null,
): { newValue: string; cursorPosition: number } => {
  const cursor = cursorPosition ?? 0;

  const { word, cursorStart, cursorEnd } = getCursorWord(inputValue, cursorPosition);

  const firstSection = inputValue.toString().substring(0, cursorStart);
  const lastSection = inputValue.toString().substring(cursorEnd);
  const newValue = firstSection + suggestion.value + lastSection;

  return {
    newValue,
    cursorPosition: cursorStart + suggestion.value.length,
  };
};
