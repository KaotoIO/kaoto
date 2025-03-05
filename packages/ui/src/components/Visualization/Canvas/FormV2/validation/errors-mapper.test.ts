import { errorsMapper } from './errors-mapper';
import { ErrorObject } from 'ajv';

describe('errorsMapper', () => {
  const example: ErrorObject[] = [
    {
      instancePath: '',
      schemaPath: '#/additionalProperties',
      keyword: 'additionalProperties',
      params: {
        additionalProperty: 'uri',
      },
      message: 'must NOT have additional properties',
    },
    {
      instancePath: '/parameters',
      schemaPath: '#/properties/parameters/required',
      keyword: 'required',
      params: {
        missingProperty: 'label',
      },
      message: "must have required property 'label'",
    },
  ];

  it('should return an empty object when errors are undefined', () => {
    const result = errorsMapper();
    expect(result).toEqual({});
  });

  it('should return an empty object when errors are null', () => {
    const result = errorsMapper(null);
    expect(result).toEqual({});
  });

  it('should return an empty object when errors are an empty array', () => {
    const result = errorsMapper([]);
    expect(result).toEqual({});
  });

  it('should map errors correctly', () => {
    const result = errorsMapper(example);
    expect(result).toEqual({
      '#.parameters.label': ["must have required property 'label'"],
    });
  });

  it('should ignore errors without a message', () => {
    const errorsWithoutMessage: ErrorObject[] = [
      {
        instancePath: '/parameters',
        schemaPath: '#/properties/parameters/required',
        keyword: 'required',
        params: {
          missingProperty: 'label',
        },
        message: undefined,
      },
    ];
    const result = errorsMapper(errorsWithoutMessage);
    expect(result).toEqual({});
  });

  it('should ignore errors with a keyword other than "required"', () => {
    const errorsWithDifferentKeyword: ErrorObject[] = [
      {
        instancePath: '',
        schemaPath: '#/additionalProperties',
        keyword: 'additionalProperties',
        params: {
          additionalProperty: 'uri',
        },
        message: 'must NOT have additional properties',
      },
    ];
    const result = errorsMapper(errorsWithDifferentKeyword);
    expect(result).toEqual({});
  });
});
