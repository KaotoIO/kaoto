import { readFileAsString } from './read-file-as-string';

describe('readFileAsString()', () => {
  it('should read', async () => {
    const file = new File(['foo'], 'foo.txt', {
      type: 'text/plain',
    });

    // JSDOM doesn't implement File.text(), add it for testing
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('foo'),
      writable: true,
      configurable: true,
    });

    const answer = await readFileAsString(file);

    expect(answer).toBe('foo');
    expect(file.text).toHaveBeenCalledOnce();
  });
});
