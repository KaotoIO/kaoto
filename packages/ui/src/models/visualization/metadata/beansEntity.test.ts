import { isBeans } from './beansEntity';
import { beansJson } from '../../../stubs/beans';

describe('isBeans', () => {
  it.each([
    [beansJson, true],
    [undefined, false],
    [null, false],
    [true, false],
    [false, false],
  ])('should mark %s as isBeans: %s', (beans, result) => {
    expect(isBeans(beans)).toEqual(result);
  });
});
