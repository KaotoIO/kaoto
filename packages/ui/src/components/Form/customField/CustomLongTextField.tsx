import { LongTextField } from '@kaoto-next/uniforms-patternfly';
import { FunctionComponent, RefObject } from 'react';
import './CustomLongTextField.scss';

type LongTextFieldProps = Parameters<typeof LongTextField>[0] & { ref: RefObject<HTMLTextAreaElement> };

export const CustomLongTextField: FunctionComponent<LongTextFieldProps> = (props) => {
  return (
    <LongTextField className="custom-long-test-field" {...props} inputRef={props.ref} rows={1} autoResize={true} />
  );
};
