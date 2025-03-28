import {
  Badge,
  FormGroup,
  FormGroupLabelHelp,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Popover,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';
import { FieldProps } from '../typings';
import clsx from 'clsx';

interface FieldWrapperProps extends FieldProps {
  type: string;
  title?: ReactNode;
  description?: string;
  defaultValue?: string;
  errors?: string[];
  isRow?: boolean;
  isRaw?: boolean;
}

export const FieldWrapper: FunctionComponent<PropsWithChildren<FieldWrapperProps>> = ({
  propName,
  required,
  title,
  type,
  description,
  defaultValue = 'no default value',
  errors,
  isRow = false,
  children,
  isRaw = false,
}) => {
  const id = `${propName}-popover`;
  const label = title ?? propName.split('.').pop();

  return (
    <>
      <FormGroup
        className={clsx({ 'kaoto-form__wrapper--row': isRow })}
        data-testid={`${propName}__field-wrapper`}
        fieldId={propName}
        label={label}
        isRequired={required}
        labelInfo={isRaw && <Badge isRead>raw</Badge>}
        labelHelp={
          <Popover
            id={id}
            headerContent={
              <p className="kaoto-form__label">
                {label} {`<${type}>`}
              </p>
            }
            bodyContent={<p>{description}</p>}
            footerContent={<p>Default: {defaultValue}</p>}
            triggerAction="hover"
            withFocusTrap={false}
          >
            <FormGroupLabelHelp aria-label={`More info for ${label} field`} />
          </Popover>
        }
      >
        {children}
      </FormGroup>

      {errors && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
              {errors?.map((error) => (
                <div key={error} id={id} aria-live="polite" aria-atomic="true">
                  {error}
                </div>
              ))}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </>
  );
};
