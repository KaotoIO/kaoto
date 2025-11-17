import { beansJson } from '../../../stubs/beans';
import { BeansEntity, isBeans } from './beansEntity';

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

describe('BeansEntity', () => {
  it('should return JSON', () => {
    const beans = new BeansEntity(beansJson);
    expect(beans.toJSON()).toEqual(beansJson);
  });
});
