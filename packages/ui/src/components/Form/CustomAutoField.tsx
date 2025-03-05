import { BoolField, DateField, ListField, RadioField, TextField } from '@kaoto-next/uniforms-patternfly';
import { createAutoField } from 'uniforms';
import { getValue } from '../../utils';
import { CustomLongTextField } from './customField/CustomLongTextField';
import { CustomNestField } from './customField/CustomNestField';
import { DisabledField } from './customField/DisabledField';
import { PasswordField } from './customField/PasswordField';
import { PropertiesField } from './properties/PropertiesField';

// Name of the properties that should load CustomLongTextField
const CustomLongTextProps = ['Expression', 'Description', 'Query'];

/**
 * Custom AutoField that supports all the fields from Uniforms PatternFly
 * In case a field is not supported, it will render a DisabledField
 */
export const CustomAutoField = createAutoField((props) => {
  if (props.options) {
    return props.checkboxes && props.fieldType !== Array ? RadioField : TextField;
  }

  const title = getValue(props, 'field.title');
  // Assuming generic object field without any children to use PropertiesField
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (props.fieldType === Object && (props.field as any)?.type === 'object' && !(props.field as any)?.properties) {
    return PropertiesField;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((props.field as any)?.format === 'password') {
    return PasswordField;
  }

  switch (props.fieldType) {
    case Array:
      return ListField;
    case Boolean:
      return BoolField;
    case Date:
      return DateField;
    case Number:
      return TextField;
    case Object:
      return CustomNestField;
    case String:
      if (CustomLongTextProps.includes(title)) {
        return CustomLongTextField;
      }
      return TextField;
  }

  return DisabledField;

  /** Once all the fields are supported, we could fail fast again and uncomment the following line */
  /** return invariant(false, 'Unsupported field type: %s', props.fieldType); */
});

export const CustomAutoFieldDetector = () => CustomAutoField;
