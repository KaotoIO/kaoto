import { qname } from 'xml-name-validator';

import { NCNAME } from './xpath-name';

const isNCName = (name: string) => !name.includes(':') && qname(name);
const anchoredNCName = new RegExp(`^(?:${NCNAME.source})$`);

const NAME_START_RANGES: Array<[number, number]> = [
  [0x41, 0x5a],
  [0x5f, 0x5f],
  [0x61, 0x7a],
  [0xc0, 0xd6],
  [0xd8, 0xf6],
  [0xf8, 0x2ff],
  [0x370, 0x37d],
  [0x37f, 0x1fff],
  [0x200c, 0x200d],
  [0x2070, 0x218f],
  [0x2c00, 0x2fef],
  [0x3001, 0xd7ff],
  [0xf900, 0xfdcf],
  [0xfdf0, 0xfffd],
  [0x10000, 0xeffff],
];

const NAME_ONLY_RANGES: Array<[number, number]> = [
  [0x2d, 0x2e],
  [0x30, 0x39],
  [0xb7, 0xb7],
  [0x300, 0x36f],
  [0x203f, 0x2040],
];

const boundaryCharacters = (): string[] => {
  const codePoints = new Set<number>();
  for (const [first, last] of [...NAME_START_RANGES, ...NAME_ONLY_RANGES]) {
    codePoints.add(first);
    codePoints.add(last);
    codePoints.add(last + 1);
    codePoints.add(first - 1);
  }
  return Array.from(codePoints)
    .filter((codePoint) => codePoint > 0 && (codePoint < 0xd800 || codePoint > 0xdfff))
    .map((codePoint) => String.fromCodePoint(codePoint));
};

describe('xpath-name', () => {
  describe('NCNAME', () => {
    it.each([
      '_foo',
      'param\u1F62dee',
      '\u{10000}a',
      'caf\u00E9',
      '\u6570\u91CF',
      '\u03B1\u03B2',
      'a\u00B7b',
      'a\u0301b',
      'a\u203Fb',
      'in\u00E9',
      '\u{EFFFF}x',
      '\u{F0000}x',
      '\u00B7a',
      '1a',
      '-a',
      '.a',
      'a:b',
      'a-b.c_d',
    ])('should agree with xml-name-validator on %s', (name) => {
      expect(anchoredNCName.test(name)).toBe(isNCName(name));
    });

    it('should agree with xml-name-validator on every range boundary', () => {
      for (const character of boundaryCharacters()) {
        expect(anchoredNCName.test(character)).toBe(isNCName(character));
        expect(anchoredNCName.test(`a${character}`)).toBe(isNCName(`a${character}`));
      }
    });
  });
});
