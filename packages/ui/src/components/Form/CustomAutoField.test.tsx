jest.mock('uniforms', () => {
  const uniforms = jest.requireActual('uniforms');

  return {
    ...uniforms,
    createAutoField: (fn: () => void) => fn,
    connectField: (fn: () => void) => fn,
  };
});

import { BoolField, DateField, ListField, RadioField, TextField } from '@kaoto-next/uniforms-patternfly';
import { AutoFieldProps } from 'uniforms';
import { CustomAutoField } from './CustomAutoField';
import { CustomNestField } from './customField/CustomNestField';
import { DisabledField } from './customField/DisabledField';
import { TypeaheadField } from './customField/TypeaheadField';

describe('CustomAutoField', () => {
  it('should return `RadioField` if `props.options` & `props.checkboxes` are defined and `props.fieldType` is not `Array`', () => {
    const props: AutoFieldProps = {
      options: [],
      name: 'test',
      checkboxes: true,
      fieldType: 'string',
    };

    const result = CustomAutoField(props);

    expect(result).toBe(RadioField);
  });

  it('should return `SelectField` if `props.options` & `props.checkboxes` are defined and `props.fieldType` is `Array`', () => {
    const props: AutoFieldProps = {
      options: [],
      name: 'test',
      checkboxes: true,
      fieldType: Array,
    };

    const result = CustomAutoField(props);

    expect(result).toBe(TypeaheadField);
  });

  it('should return `DisabledField` if `props.name` ends with `steps`', () => {
    const props: AutoFieldProps = {
      name: 'test.steps',
      fieldType: 'string',
    };

    const result = CustomAutoField(props);

    expect(result).toBe(DisabledField);
  });

  it('should return `ListField` if `props.fieldType` is `Array`', () => {
    const props: AutoFieldProps = {
      name: 'test',
      fieldType: Array,
    };

    const result = CustomAutoField(props);

    expect(result).toBe(ListField);
  });

  it('should return `BoolField` if `props.fieldType` is `Boolean`', () => {
    const props: AutoFieldProps = {
      name: 'test',
      fieldType: Boolean,
    };

    const result = CustomAutoField(props);

    expect(result).toBe(BoolField);
  });

  it('should return `DateField` if `props.fieldType` is `Date`', () => {
    const props: AutoFieldProps = {
      name: 'test',
      fieldType: Date,
    };

    const result = CustomAutoField(props);

    expect(result).toBe(DateField);
  });

  it('should return `TextField` if `props.fieldType` is `Number`', () => {
    const props: AutoFieldProps = {
      name: 'test',
      fieldType: Number,
    };

    const result = CustomAutoField(props);

    expect(result).toBe(TextField);
  });

  it('should return `CustomNestField` if `props.fieldType` is `Object`', () => {
    const props: AutoFieldProps = {
      name: 'test',
      fieldType: Object,
    };

    const result = CustomAutoField(props);

    expect(result).toBe(CustomNestField);
  });

  it('should return `TextField` if `props.fieldType` is `String`', () => {
    const props: AutoFieldProps = {
      name: 'test',
      fieldType: String,
    };

    const result = CustomAutoField(props);

    expect(result).toBe(TextField);
  });

  it('should return `DisabledField` if `props.fieldType` is not supported', () => {
    const props: AutoFieldProps = {
      name: 'test',
      fieldType: 'unsupported',
    };

    const result = CustomAutoField(props);

    expect(result).toBe(DisabledField);
  });
});
