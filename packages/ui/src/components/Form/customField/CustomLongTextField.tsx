import { HTMLFieldProps } from 'uniforms';
import { LongTextField } from '@kaoto-next/uniforms-patternfly';
import './CustomLongTextField.scss';

export type CustomLongTextFieldProps = HTMLFieldProps<string, HTMLDivElement>;

export const CustomLongTextField = (props: CustomLongTextFieldProps) => {
  return <LongTextField className="custom-long-test-field" {...props} rows={1} autoResize={true} />;
};
