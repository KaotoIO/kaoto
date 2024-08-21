import { generateRandomId, readFileAsString } from './common';

describe('generateRandomId()', () => {
  it('should generate', () => {
    const generated = generateRandomId('dummy', 4);
    expect(generated).toMatch(/dummy-\d{4}/);
    expect(generateRandomId('dummy', 4)).not.toEqual(generateRandomId('dummy', 4));
  });
});

describe('readFileAsString()', () => {
  it('should read', async () => {
    const file = new File(['foo'], 'foo.txt', {
      type: 'text/plain',
    });
    const answer = await readFileAsString(file);
    expect(answer).toEqual('foo');
  });
});
