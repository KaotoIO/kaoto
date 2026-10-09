import './XsltDocumentRenameInput.scss';

import {
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  TextInput,
} from '@patternfly/react-core';
import { CheckIcon, ExclamationCircleIcon, PencilAltIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, KeyboardEventHandler, MouseEventHandler, useCallback, useEffect, useState } from 'react';

import { IDataTestID, ValidationResult, ValidationStatus } from '../../models';

interface IXsltDocumentRenameInput extends IDataTestID {
  editTitle?: string;
  textTitle?: string;
  value?: string;
  validator?: (value: string) => ValidationResult | Promise<ValidationResult>;
  onChange?: (value: string) => void | Promise<void>;
  onEditingStateChange?: (isEditing: boolean) => void;
  placeholder?: string;
  className?: string;
}

export const XsltDocumentRenameInput: FunctionComponent<IXsltDocumentRenameInput> = ({
  value = '',
  validator,
  editTitle,
  textTitle,
  placeholder,
  onChange,
  onEditingStateChange,
  className,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationInputs, setValidationInputs] = useState({ localValue, value, validator });
  if (
    validationInputs.localValue !== localValue ||
    validationInputs.value !== value ||
    validationInputs.validator !== validator
  ) {
    setValidationInputs({ localValue, value, validator });
  }

  // A completion belongs to one input snapshot. A late promise may settle before effect
  // cleanup, but its result must never change the validation of a newer snapshot.
  const [validation, setValidation] = useState<{
    inputs: typeof validationInputs;
    result: ValidationResult;
  }>();
  const validationResult =
    validation?.inputs === validationInputs ? validation.result : { status: ValidationStatus.Default, errMessages: [] };
  const isValidating =
    localValue !== value && typeof validator === 'function' && validation?.inputs !== validationInputs;
  const setValidationResult = useCallback(
    (result: ValidationResult) => {
      setValidation({ inputs: validationInputs, result });
    },
    [validationInputs],
  );

  useEffect(() => {
    if (localValue === value || typeof validator !== 'function') return;
    let isCurrent = true;

    const runValidation = async () => {
      try {
        const result = await validator(localValue);
        if (isCurrent) {
          setValidationResult(result);
        }
      } catch {
        if (isCurrent) {
          setValidationResult({
            status: ValidationStatus.Error,
            errMessages: ['Validation failed. Please try again.'],
          });
        }
      }
    };

    void runValidation();

    return () => {
      isCurrent = false;
    };
  }, [localValue, value, validator, setValidationResult]);

  const focusTextInput = useCallback((element: HTMLInputElement) => {
    element?.focus();
  }, []);

  const onEdit: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      setIsEditing(true);
      onEditingStateChange?.(true);
      event.stopPropagation();
    },
    [onEditingStateChange],
  );

  const onInputValueChange = useCallback((_event: unknown, inputValue: string) => {
    setLocalValue(inputValue);
  }, []);

  const saveValue = useCallback(async () => {
    if (isValidating || isSaving || validationResult.status === ValidationStatus.Error) {
      return;
    }

    if (localValue !== value && typeof onChange === 'function') {
      setIsSaving(true);
      try {
        await onChange(localValue);
      } catch {
        setValidationResult({
          status: ValidationStatus.Error,
          errMessages: ['Unable to save document name. Please try again.'],
        });
        setIsSaving(false);
        return;
      }
    }
    setValidationResult({ status: ValidationStatus.Default, errMessages: [] });
    setIsSaving(false);
    setIsEditing(false);
    onEditingStateChange?.(false);
  }, [
    isValidating,
    isSaving,
    localValue,
    value,
    onChange,
    onEditingStateChange,
    validationResult.status,
    setValidationResult,
  ]);

  const cancelValue = useCallback(() => {
    setLocalValue(value);
    setValidationResult({ status: ValidationStatus.Default, errMessages: [] });
    setIsEditing(false);
    onEditingStateChange?.(false);
  }, [value, onEditingStateChange, setValidationResult]);

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        saveValue().catch(() => {
          // errors are handled inside saveValue
        });
      }
      if (event.key === 'Escape') {
        cancelValue();
      }
    },
    [cancelValue, saveValue],
  );

  const onSave: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      saveValue().catch(() => {
        // errors are handled inside saveValue
      });
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

  const isInvalid = validationResult.status === ValidationStatus.Error;
  const validationState = isInvalid ? 'error' : 'default';

  return (
    <>
      {isEditing ? (
        <Form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <FormGroup fieldId="xslt-document-rename-value" data-testid={props['data-testid'] + '--form'}>
            <InputGroup>
              <InputGroupItem isFill>
                <TextInput
                  id="xslt-document-rename-value"
                  name="xslt-document-rename-value"
                  aria-label="xslt-document-rename-value"
                  data-testid={props['data-testid'] + '--text-input'}
                  type="text"
                  ref={focusTextInput}
                  onChange={onInputValueChange}
                  value={localValue}
                  aria-invalid={isInvalid}
                  onKeyDown={onKeyDown}
                  validated={validationState}
                  isDisabled={isSaving}
                />
              </InputGroupItem>
              <InputGroupItem>
                <div className="xslt-document-rename-action-buttons">
                  <Button
                    icon={<CheckIcon />}
                    variant="plain"
                    aria-label="Save value"
                    onClick={onSave}
                    data-testid={props['data-testid'] + '--save'}
                    isDisabled={isInvalid || isSaving || isValidating}
                  />
                  <Button
                    icon={<TimesIcon />}
                    variant="plain"
                    aria-label="Cancel editing"
                    data-testid={props['data-testid'] + '--cancel'}
                    onClick={onCancel}
                    isDisabled={isSaving}
                  />
                </div>
              </InputGroupItem>
            </InputGroup>
            {isInvalid && validationResult.errMessages.length > 0 && (
              <HelperText>
                <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                  {validationResult.errMessages[0]}
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
        </Form>
      ) : (
        <div className="xslt-document-rename-wrapper">
          <span title={textTitle} aria-label={textTitle} data-testid={props['data-testid']} className={className}>
            {localValue || placeholder}
          </span>
          <Button
            title={editTitle}
            variant="plain"
            data-testid={props['data-testid'] + '--edit'}
            onClick={onEdit}
            icon={<PencilAltIcon />}
          />
        </div>
      )}
    </>
  );
};

export default XsltDocumentRenameInput;
