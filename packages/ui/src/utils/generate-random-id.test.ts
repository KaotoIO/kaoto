import { generateRandomId } from './generate-random-id';

describe('generateRandomId()', () => {
  it('should generate', () => {
    const generated = generateRandomId('dummy', 4);
    expect(generated).toMatch(/dummy-\d{4}/);
    expect(generateRandomId('dummy', 4)).not.toEqual(generateRandomId('dummy', 4));
  });
});
