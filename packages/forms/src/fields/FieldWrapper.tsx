import { IconButton, Stack, Toggletip, ToggletipButton, ToggletipContent, Tag } from '@carbon/react';
import { Idea, Information, WarningFilled } from '@carbon/icons-react';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';
import { FieldProps } from '../models/typings';
import clsx from 'clsx';
import './FieldWrapper.scss';

interface FieldWrapperProps extends FieldProps {
  type: string;
  title?: ReactNode;
  description?: string;
  defaultValue?: string;
  errors?: string[];
  isRow?: boolean;
  isRaw?: boolean;
  onOpenSuggestions?: () => void;
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
  onOpenSuggestions,
}) => {
  const id = `${propName}-popover`;
  const label = title ?? propName.split('.').pop();

  return (
    <Stack gap={3} className={clsx({ 'kaoto-form__wrapper--row': isRow })} data-testid={`${propName}__field-wrapper`}>
      <div className="kaoto-field-wrapper__label-container">
        <label className="kaoto-field-wrapper__label">
          {required && <span className="kaoto-field-wrapper__required">*</span>}
          {label}
        </label>
        {isRaw && <Tag size="sm">raw</Tag>}
        <Toggletip autoAlign>
          <ToggletipButton label={`More info for ${label} field`}>
            <Information />
          </ToggletipButton>
          <ToggletipContent>
            <p>
              <strong>
                {label} {`<${type}>`}
              </strong>
            </p>
            <p>{description}</p>
            <p>Default: {defaultValue}</p>
          </ToggletipContent>
        </Toggletip>
        {onOpenSuggestions && (
          <IconButton
            kind="ghost"
            size="sm"
            label="Open suggestions (Ctrl+Space)"
            onClick={onOpenSuggestions}
            data-testid={`${propName}__open-suggestions-button`}
          >
            <Idea />
          </IconButton>
        )}
      </div>

      {children}

      {errors && (
        <div className="kaoto-field-wrapper__error-container">
          <WarningFilled size={16} className="kaoto-field-wrapper__error-icon" />
          <div>
            {errors.map((error) => (
              <div key={error} id={id} aria-live="polite" aria-atomic="true">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </Stack>
  );
};
