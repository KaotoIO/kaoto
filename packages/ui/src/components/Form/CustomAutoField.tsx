import {
  BoolField,
  DateField,
  ListField,
  NumField,
  RadioField,
  SelectField,
  TextField,
} from '@kaoto-next/uniforms-patternfly';
import { createAutoField } from 'uniforms';
import { CustomNestField } from './CustomNestField';
import { DisabledField } from './DisabledField';
import { PropertiesField } from './properties/PropertiesField';

/**
 * Custom AutoField that supports all the fields from Uniforms PatternFly
 * In case a field is not supported, it will render a DisabledField
 */
export const CustomAutoField = createAutoField((props) => {
  if (props.options) {
    return props.checkboxes && props.fieldType !== Array ? RadioField : SelectField;
  }

  if (props.name.endsWith('steps')) {
    return DisabledField;
  }

  // Assuming generic object field without any children to use PropertiesField
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (props.fieldType === Object && (props.field as any)?.type === 'object' && !(props.field as any)?.properties) {
    return PropertiesField;
  }

  switch (props.fieldType) {
    case Array:
      return ListField;
    case Boolean:
      return BoolField;
    case Date:
      return DateField;
    case Number:
      return NumField;
    case Object:
      return CustomNestField;
    case String:
      return TextField;
  }

  return DisabledField;

  /** Once all the fields are supported, we could fail fast again and uncomment the following line */
  /** return invariant(false, 'Unsupported field type: %s', props.fieldType); */
});
