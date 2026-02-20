import './InlineEdit.scss';

import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  TextInput,
} from '@patternfly/react-core';
import { CheckIcon, ExclamationCircleIcon, PencilAltIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, KeyboardEventHandler, MouseEventHandler, useCallback, useState } from 'react';

import { IDataTestID, ValidationResult, ValidationStatus } from '../../models';

interface IInlineEdit extends IDataTestID {
  editTitle?: string;
  textTitle?: string;
  value?: string;
  validator?: (value: string) => ValidationResult;
  onChange?: (value: string) => void;
  onClick?: () => void;
  placeholder?: string;
  className?: string;
}

export const InlineEdit: FunctionComponent<IInlineEdit> = (props) => {
  const [localValue, setLocalValue] = useState(props.value ?? '');
  const [isReadOnly, setIsReadOnly] = useState(true);

  const focusTextInput = useCallback((element: HTMLInputElement) => {
    element?.focus();
  }, []);

  const [validationResult, setValidationResult] = useState<ValidationResult>({
    status: ValidationStatus.Default,
    errMessages: [],
  });

  const onEdit: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    setIsReadOnly(false);
    event.stopPropagation();
  }, []);

  const onChange = useCallback(
    (_event: unknown, value: string) => {
      setLocalValue(value);

      if (value === props.value) {
        setValidationResult({ status: ValidationStatus.Default, errMessages: [] });
        return;
      }

      if (typeof props.validator === 'function') {
        setValidationResult(props.validator(value));
      }
    },
    [props],
  );

  const saveValue = useCallback(() => {
    if (validationResult.status !== ValidationStatus.Default && validationResult.status !== ValidationStatus.Success)
      return;

    setIsReadOnly(true);
    if (localValue !== props.value && typeof props.onChange === 'function') {
      props.onChange(localValue);
    }
  }, [localValue, props, validationResult]);

  const cancelValue = useCallback(() => {
    setLocalValue(props.value ?? '');
    setValidationResult({ status: ValidationStatus.Default, errMessages: [] });
    setIsReadOnly(true);
  }, [props.value]);

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        saveValue();
      }
      if (event.key === 'Escape') {
        cancelValue();
      }
      event.stopPropagation();
    },
    [cancelValue, saveValue],
  );

  const onSave: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      saveValue();
      event.stopPropagation();
    },
    [saveValue],
  );

  const onCancel: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      cancelValue();
      event.stopPropagation();
    },
    [cancelValue],
  );

  return (
    <>
      {isReadOnly ? (
        <>
          <span
            title={props.textTitle}
            aria-label={props.textTitle}
            data-clickable={typeof props.onClick === 'function'}
            data-testid={props['data-testid']}
            onClick={props.onClick}
            className={props.className ? props.className : undefined}
          >
            {props.value || props.placeholder}
          </span>
          &nbsp;&nbsp;
          <Button
            title={props.editTitle}
            variant="plain"
            data-testid={props['data-testid'] + '--edit'}
            onClick={onEdit}
            icon={<PencilAltIcon />}
          />
        </>
      ) : (
        <FormGroup data-testid={props['data-testid'] + '--form'}>
          <FormGroup type="text" fieldId="edit-value" className={props.className ? props.className : undefined}>
            <InputGroup>
              <InputGroupItem isFill>
                <TextInput
                  id="edit-value"
                  name="edit-value"
                  aria-label="edit-value"
                  data-testid={props['data-testid'] + '--text-input'}
                  type="text"
                  ref={focusTextInput}
                  onChange={onChange}
                  value={localValue}
                  aria-invalid={validationResult.status === ValidationStatus.Error}
                  onKeyDown={onKeyDown}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      variant={validationResult.status}
                      {...(validationResult.status === ValidationStatus.Error && { icon: <ExclamationCircleIcon /> })}
                    >
                      {validationResult.errMessages[0]}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </InputGroupItem>

              <InputGroupItem>
                <Button
                  icon={<CheckIcon />}
                  variant="plain"
                  aria-label="save button for editing value"
                  onClick={onSave}
                  data-testid={props['data-testid'] + '--save'}
                  aria-disabled={validationResult.status === ValidationStatus.Error}
                  isDisabled={validationResult.status === ValidationStatus.Error}
                />
              </InputGroupItem>

              <InputGroupItem>
                <Button
                  icon={<TimesIcon />}
                  variant="plain"
                  aria-label="close button for editing value"
                  data-testid={props['data-testid'] + '--cancel'}
                  onClick={onCancel}
                />
              </InputGroupItem>
            </InputGroup>
          </FormGroup>
        </FormGroup>
      )}
    </>
  );
};
