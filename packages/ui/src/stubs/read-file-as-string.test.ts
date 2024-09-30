import { readFileAsString } from './read-file-as-string';

describe('readFileAsString()', () => {
  it('should read', async () => {
    const file = new File(['foo'], 'foo.txt', {
      type: 'text/plain',
    });
    const answer = await readFileAsString(file);
    expect(answer).toEqual('foo');
  });
});
