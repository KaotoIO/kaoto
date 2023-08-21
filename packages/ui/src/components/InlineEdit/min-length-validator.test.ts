import { ValidationStatus } from '../../models';
import { minLengthValidator } from './min-length-validator';

describe('min-length-validator', () => {
  it('should return error if value is shorter than 5 characters', () => {
    const result = minLengthValidator('1234');
    expect(result).toEqual({
      status: ValidationStatus.Error,
      errMessages: ['Value must be at least 5 characters long'],
    });
  });

  it('should return success if value is at least 5 characters', () => {
    const result = minLengthValidator('12345');
    expect(result).toEqual({
      status: ValidationStatus.Success,
      errMessages: [],
    });
  });
});
