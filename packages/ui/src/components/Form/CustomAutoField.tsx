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

export const CustomAutoField = createAutoField((props) => {
  if (props.allowedValues) {
    return props.checkboxes && props.fieldType !== Array ? RadioField : SelectField;
  }

  if (props.name.endsWith('steps')) {
    return DisabledField;
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
