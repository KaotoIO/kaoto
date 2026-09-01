import { readFileAsString } from './read-file-as-string';

// Local polyfill for Blob.text() / File.text() - not implemented in JSDOM
// See https://github.com/jsdom/jsdom/issues/3405
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = async function (this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

describe('readFileAsString()', () => {
  it('should read', async () => {
    const file = new File(['foo'], 'foo.txt', {
      type: 'text/plain',
    });
    const answer = await readFileAsString(file);
    expect(answer).toBe('foo');
  });
});
