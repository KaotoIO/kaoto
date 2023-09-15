import { BoolField, DateField, ListField, NumField, RadioField, SelectField } from '@kie-tools/uniforms-patternfly';
import invariant from 'invariant';
import { createAutoField } from 'uniforms';
import { CustomNestField } from './CustomNestField';
import { CustomStepsField } from './CustomStepsField';
import { CustomTextField } from './CustomTextField';

export const CustomAutoField = createAutoField((props) => {
  if (props.allowedValues) {
    return props.checkboxes && props.fieldType !== Array ? RadioField : SelectField;
  }

  if (props.name.endsWith('steps')) {
    return CustomStepsField;
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
      return CustomTextField;
  }

  return invariant(false, 'Unsupported field type: %s', props.fieldType);
});
