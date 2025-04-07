import { useContext, useState } from 'react';
import { safeGetValue } from '../../../../../utils';
import { ModelContext } from '../providers/ModelProvider';

function checkIfWrappedWithRaw(value: unknown): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('RAW(') && value.endsWith(')');
}

export const useFieldValue = <T = unknown>(propertyPath: string) => {
  const { model, errors, onPropertyChange, disabled } = useContext(ModelContext);
  const propertyName = propertyPath.replace('#.', '');
  const value = safeGetValue(model, propertyName) as T | undefined;
  const [isRaw, setIsRaw] = useState(checkIfWrappedWithRaw(value));

  const propertyErrors = errors?.[propertyPath];

  const onChange = (value: T) => {
    onPropertyChange(propertyName, value);
    setIsRaw(checkIfWrappedWithRaw(value));
  };

  const wrapValueWithRaw = () => {
    if (typeof value !== 'string') return;

    if (!isRaw) {
      onChange(`RAW(${value})` as T);
      setIsRaw(true);
    } else {
      const newValue = value.substring(4, value.length - 1);
      onChange(newValue as T);
      setIsRaw(false);
    }
  };

  return {
    value,
    errors: propertyErrors,
    onChange,
    wrapValueWithRaw,
    isRaw,
    disabled,
  };
};
