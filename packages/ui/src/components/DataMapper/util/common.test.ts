import { CommonUtil } from './common';

describe('generateRandomId()', () => {
  it('should generate', () => {
    const generated = CommonUtil.generateRandomId('dummy', 4);
    expect(generated).toMatch(/dummy-\d{4}/);
    expect(CommonUtil.generateRandomId('dummy', 4)).not.toEqual(CommonUtil.generateRandomId('dummy', 4));
  });
});

describe('readFileAsString()', () => {
  it('should read', async () => {
    const file = new File(['foo'], 'foo.txt', {
      type: 'text/plain',
    });
    const answer = await CommonUtil.readFileAsString(file);
    expect(answer).toEqual('foo');
  });
});
