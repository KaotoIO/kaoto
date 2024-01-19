import { SelectField, SelectFieldProps } from '@kaoto-next/uniforms-patternfly';
import { FunctionComponent } from 'react';

export const CustomSelectField: FunctionComponent<SelectFieldProps> = (props) => {
  return <SelectField {...(props as SelectFieldProps)} placeholder="Please select an option..." />;
};
