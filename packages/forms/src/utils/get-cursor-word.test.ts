import { getCursorWord } from './get-cursor-word';

describe('getCursorWord', () => {
  const testCases = [
    { input: 'Hello, world!', cursor: 0, expected: { word: 'Hello,', cursorStart: 0, cursorEnd: 6 } },
    { input: 'Hello, world!', cursor: 5, expected: { word: 'Hello,', cursorStart: 0, cursorEnd: 6 } },
    { input: 'Hello, world!', cursor: 6, expected: { word: 'Hello,', cursorStart: 0, cursorEnd: 6 } },
    { input: 'Hello, world!', cursor: 7, expected: { word: 'world!', cursorStart: 7, cursorEnd: 13 } },
    { input: 'Hello, world!', cursor: 13, expected: { word: 'world!', cursorStart: 7, cursorEnd: 13 } },
    { input: 'Hello, world! ', cursor: 14, expected: { word: '', cursorStart: 14, cursorEnd: 14 } },
    { input: ' ', cursor: 0, expected: { word: '', cursorStart: 0, cursorEnd: 0 } },
    { input: ' ', cursor: 1, expected: { word: '', cursorStart: 1, cursorEnd: 1 } },
    { input: '', cursor: 0, expected: { word: '', cursorStart: 0, cursorEnd: 0 } },
    { input: '', cursor: 1, expected: { word: '', cursorStart: 0, cursorEnd: 0 } },
    { input: '', cursor: -1, expected: { word: '', cursorStart: 0, cursorEnd: 0 } },
    { input: '', cursor: 10, expected: { word: '', cursorStart: 0, cursorEnd: 0 } },
    { input: 'Hello, world!', cursor: -10, expected: { word: 'Hello,', cursorStart: 0, cursorEnd: 6 } },
    { input: 'Hello, world!', cursor: 30, expected: { word: 'world!', cursorStart: 7, cursorEnd: 13 } },
    { input: 45, cursor: 0, expected: { word: '45', cursorStart: 0, cursorEnd: 2 } },
  ];

  it.each(testCases)('returns the correct word for input "$input" at cursor $cursor', ({ input, cursor, expected }) => {
    const result = getCursorWord(input, cursor);
    expect(result).toEqual(expected);
  });
});
