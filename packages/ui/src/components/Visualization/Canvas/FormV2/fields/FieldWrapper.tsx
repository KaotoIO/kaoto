import { FormGroup, FormGroupLabelHelp, Popover } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';
import { FieldProps } from '../typings';

interface FieldWrapperProps extends FieldProps {
  type: string;
  title?: ReactNode;
  description?: string;
  defaultValue?: string;
}

export const FieldWrapper: FunctionComponent<PropsWithChildren<FieldWrapperProps>> = ({
  propName,
  required,
  title,
  type,
  description,
  defaultValue = 'no default value',
  children,
}) => {
  const id = `${propName}-popover`;

  return (
    <FormGroup
      fieldId={propName}
      label={title ?? propName}
      isRequired={required}
      labelHelp={
        <Popover
          id={id}
          headerContent={
            <p>
              {title} {`<${type}>`}
            </p>
          }
          bodyContent={<p>{description}</p>}
          footerContent={<p>Default: {defaultValue}</p>}
          triggerAction="hover"
          withFocusTrap={false}
        >
          <FormGroupLabelHelp aria-label={`More info for ${title} field`} />
        </Popover>
      }
    >
      {children}
    </FormGroup>
  );
};
