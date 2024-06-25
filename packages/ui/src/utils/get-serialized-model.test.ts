import { getSerializedModel } from './get-serialized-model';

describe('getSerializedModel', () => {
  let inputValue: Record<string, unknown>;

  it('should get an object with empty string value unserialized', () => {
    inputValue = {
      name: 'test',
      type: 'test',
      builderClass: '',
      constructors: {
        testConstructor: 'test',
      },
      destroyMethod: ' test ',
      factoryBean: '',
      properties: {
        testProperty: {},
      },
    };

    const expectedOutputValue = {
      name: 'test',
      type: 'test',
      constructors: {
        testConstructor: 'test',
      },
      destroyMethod: ' test ',
      properties: {
        testProperty: {},
      },
    };
    const serializedModel = getSerializedModel(inputValue);
    expect(serializedModel).toEqual(expectedOutputValue);
  });

  it('should get a object with empty string value with whitespaces unserialized', () => {
    inputValue = {
      id: 'test',
      allowJmsType: true,
      library: '',
      collectionType: '  ',
      timezone: 'test   ',
    };

    const expectedOutputValue = {
      id: 'test',
      allowJmsType: true,
      timezone: 'test   ',
    };
    const serializedModel = getSerializedModel(inputValue);
    expect(serializedModel).toEqual(expectedOutputValue);
  });

  it('should get a empty object serialized', () => {
    inputValue = {};

    const expectedOutputValue = {};
    const serializedModel = getSerializedModel(inputValue);
    expect(serializedModel).toEqual(expectedOutputValue);
  });
});
