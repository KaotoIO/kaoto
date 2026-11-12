import './XsltDocumentRenameInput.scss';

import { EditInPlace } from '@carbon/ibm-products';
import {
  FunctionComponent,
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import { IDataTestID, ValidationResult, ValidationStatus } from '../../models';

interface IXsltDocumentRenameInput extends IDataTestID {
  editTitle?: string;
  textTitle?: string;
  value?: string;
  validator?: (value: string) => ValidationResult | Promise<ValidationResult>;
  onChange?: (value: string) => void | Promise<void>;
  onEditingStateChange?: (isEditing: boolean) => void;
  placeholder?: string;
}

const stopPropagation: MouseEventHandler<HTMLDivElement> & KeyboardEventHandler<HTMLDivElement> = (event) => {
  event.stopPropagation();
};

export const XsltDocumentRenameInput: FunctionComponent<IXsltDocumentRenameInput> = ({
  value = '',
  validator,
  editTitle,
  textTitle,
  placeholder,
  onChange,
  onEditingStateChange,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  // After a failed save, remount the editor so Cancel can restore the committed value.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isResyncingBaseline, setIsResyncingBaseline] = useState(false);
  const resyncEditorBaseline = useCallback(() => {
    flushSync(() => {
      setEditorKey((key) => key + 1);
      setIsResyncingBaseline(true);
    });
    flushSync(() => {
      setIsResyncingBaseline(false);
    });
    // The remounted editor is not focused, which hides its Save and Cancel controls
    wrapperRef.current?.querySelector('input')?.focus();
  }, []);
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

  // The field is editing while it holds an unsaved draft or a save is in flight.
  const isEditing = localValue !== value || isSaving;
  const lastReportedEditing = useRef(false);
  useEffect(() => {
    if (lastReportedEditing.current === isEditing) return;
    lastReportedEditing.current = isEditing;
    onEditingStateChange?.(isEditing);
  }, [isEditing, onEditingStateChange]);

  const onInputValueChange = useCallback(
    (inputValue: string) => {
      if (isSaving) return;
      setLocalValue(inputValue);
    },
    [isSaving],
  );

  const saveValue = useCallback(async () => {
    if (isSaving || localValue === value || validationResult.status === ValidationStatus.Error) {
      return;
    }

    setIsSaving(true);
    let isSaved = false;
    try {
      // The user may save before the validation of the latest input has settled.
      if (isValidating && typeof validator === 'function') {
        let result: ValidationResult;
        try {
          result = await validator(localValue);
        } catch {
          result = { status: ValidationStatus.Error, errMessages: ['Validation failed. Please try again.'] };
        }
        if (result.status === ValidationStatus.Error) {
          setValidationResult(result);
          return;
        }
      }

      await onChange?.(localValue);
      isSaved = true;
    } catch {
      setValidationResult({
        status: ValidationStatus.Error,
        errMessages: ['Unable to save document name. Please try again.'],
      });
    } finally {
      if (!isSaved) resyncEditorBaseline();
      setIsSaving(false);
    }
  }, [
    isSaving,
    localValue,
    value,
    validationResult.status,
    isValidating,
    validator,
    onChange,
    setValidationResult,
    resyncEditorBaseline,
  ]);

  const onSave = useCallback(() => {
    saveValue().catch(() => {
      // errors are handled inside saveValue
    });
  }, [saveValue]);

  const onCancel = useCallback(() => {
    if (isSaving) return;
    setLocalValue(value);
  }, [isSaving, value]);

  // EditInPlace blurs the input itself when Enter is pressed, right before it saves.
  // That blur must not discard the draft.
  const isEnterPressed = useRef(false);
  const onKeyDownCapture: KeyboardEventHandler<HTMLDivElement> = useCallback((event) => {
    isEnterPressed.current = event.key === 'Enter';
  }, []);

  // EditInPlace saves a changed value as soon as the input loses focus. Renaming the XSLT document
  // moves a file, so it must only happen on an explicit save. Providing a blur handler turns that off,
  // and the unsaved draft is discarded so the displayed name never differs from the actual file name.
  const onBlur = useCallback(() => {
    if (isEnterPressed.current) {
      isEnterPressed.current = false;
      return;
    }
    onCancel();
  }, [onCancel]);

  const isInvalid = validationResult.status === ValidationStatus.Error;
  const errorMessage = isInvalid ? validationResult.errMessages[0] : undefined;

  return (
    // role="none": this wrapper is scaffolding that keeps clicks and key presses away from the
    // canvas panel it is rendered in, not a control. Tabbing and keyboard/mouse/touch interaction are
    // handled by the EditInPlace controls inside.
    <div
      ref={wrapperRef}
      className="xslt-document-rename"
      role="none"
      data-testid={props['data-testid']}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      onKeyDownCapture={onKeyDownCapture}
    >
      <EditInPlace
        key={editorKey}
        id="xslt-document-rename-value"
        labelText={textTitle ?? 'XSLT document name'}
        value={isResyncingBaseline ? value : localValue}
        placeholder={placeholder}
        editAlwaysVisible
        editLabel={editTitle ?? 'Edit'}
        saveLabel="Save value"
        cancelLabel="Cancel editing"
        invalid={isInvalid}
        invalidText={errorMessage}
        onChange={onInputValueChange}
        onSave={onSave}
        onCancel={onCancel}
        onBlur={onBlur}
      />
    </div>
  );
};

export default XsltDocumentRenameInput;
