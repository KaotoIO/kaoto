import { BoolField, DateField, ListField, RadioField, TextField } from '@kaoto-next/uniforms-patternfly';
import { createAutoField } from 'uniforms';
import { getValue } from '../../utils';
import { BeanReferenceField } from './bean/BeanReferenceField';
import { CustomLongTextField } from './customField/CustomLongTextField';
import { CustomNestField } from './customField/CustomNestField';
import { DisabledField } from './customField/DisabledField';
import { PasswordField } from './customField/PasswordField';
import { TypeaheadField } from './customField/TypeaheadField';
import { ExpressionAwareNestField } from './expression/ExpressionAwareNestField';
import { ExpressionField } from './expression/ExpressionField';
import { PropertiesField } from './properties/PropertiesField';

// Name of the properties that should load CustomLongTextField
const CustomLongTextProps = ['Expression', 'Description', 'Query'];

/**
 * Custom AutoField that supports all the fields from Uniforms PatternFly
 * In case a field is not supported, it will render a DisabledField
 */
export const CustomAutoField = createAutoField((props) => {
  if (props.options) {
    return props.checkboxes && props.fieldType !== Array ? RadioField : TypeaheadField;
  }

  const title = getValue(props, 'field.title');
  const comment = getValue(props, '$comment');
  // Assuming generic object field without any children to use PropertiesField
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (props.fieldType === Object && (props.field as any)?.type === 'object' && !(props.field as any)?.properties) {
    if (comment === 'expression') {
      return ExpressionField;
    }
    return PropertiesField;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } else if (props.fieldType === Object && (props.field as any)?.type === 'object' && comment === 'expression') {
    // The property which supports inlined expression such as `/setHeaders/headers[n]
    return ExpressionAwareNestField;
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
      /* catalog preprocessor put 'string' as a type and the javaType as a schema $comment */
      if (comment?.startsWith('class:')) {
        return BeanReferenceField;
      } else if (CustomLongTextProps.includes(title)) {
        return CustomLongTextField;
      }
      return TextField;
  }

  return DisabledField;

  /** Once all the fields are supported, we could fail fast again and uncomment the following line */
  /** return invariant(false, 'Unsupported field type: %s', props.fieldType); */
});

export const CustomAutoFieldDetector = () => CustomAutoField;
