import { Suggestion } from '../models/suggestions';
import { applySuggestion } from './apply-suggestion';

type TestCase = {
  name: string;
  suggestion: Suggestion;
  inputValue: string | number;
  cursorPosition: number;
  expected: { newValue: string; cursorPosition: number };
};

const testCases: TestCase[] = [
  {
    name: 'replaces a single word at cursor (prop → {{prop}})',
    suggestion: { value: '{{prop}}' },
    inputValue: 'prop',
    cursorPosition: 4,
    expected: { newValue: '{{prop}}', cursorPosition: 8 },
  },
  {
    name: 'replaces last word in sentence (prop1 prop2 prop → prop1 prop2 {{prop}})',
    suggestion: { value: '{{prop}}' },
    inputValue: 'prop1 prop2 prop',
    cursorPosition: 16, // at the end of 'prop'
    expected: { newValue: 'prop1 prop2 {{prop}}', cursorPosition: 20 },
  },
  {
    name: 'inserts after whitespace (prop1 prop2  → prop1 prop2 suggestion)',
    suggestion: { value: 'suggestion' },
    inputValue: 'prop1 prop2 ',
    cursorPosition: 12,
    expected: { newValue: 'prop1 prop2 suggestion', cursorPosition: 22 },
  },
  {
    name: 'replaces word when cursor is in the middle (prop1 prop2, cursor at 8 → prop1 suggestion)',
    suggestion: { value: 'suggestion' },
    inputValue: 'prop1 prop2',
    cursorPosition: 8, // in the middle of 'prop2'
    expected: { newValue: 'prop1 suggestion', cursorPosition: 16 },
  },
  {
    name: 'inserts at start when input is empty',
    suggestion: { value: 'foo' },
    inputValue: '',
    cursorPosition: 0,
    expected: { newValue: 'foo', cursorPosition: 3 },
  },
  {
    name: 'replaces only the word at cursor, not others',
    suggestion: { value: 'bar' },
    inputValue: 'foo baz foo',
    cursorPosition: 1, // in the first 'foo'
    expected: { newValue: 'bar baz foo', cursorPosition: 3 },
  },
  {
    name: 'inserts at end if cursor is after last char',
    suggestion: { value: 'bar' },
    inputValue: 'foo ',
    cursorPosition: 4,
    expected: { newValue: 'foo bar', cursorPosition: 7 },
  },
];

describe('applySuggestion', () => {
  it.each(testCases)('$name', ({ suggestion, inputValue, cursorPosition, expected }) => {
    const result = applySuggestion(suggestion, inputValue, cursorPosition);
    expect(result).toEqual(expected);
  });
});
