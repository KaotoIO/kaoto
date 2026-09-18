import { useCallback, useContext, useState } from 'react';
import { isRawString, safeGetValue } from '../utils';
import { ModelContext } from '../providers/ModelProvider';

export const useFieldValue = <T = unknown>(propertyPath: string) => {
  const { model, errors, onPropertyChange, disabled } = useContext(ModelContext);
  const propertyName = propertyPath.replace('#.', '');
  const propertyErrors = errors?.[propertyPath];
  const value = safeGetValue(model, propertyName) as T | undefined;

  const [isRaw, setIsRaw] = useState<boolean>(isRawString(value));

  const onChange = useCallback(
    (newValue: T) => {
      setIsRaw(isRawString(newValue));
      onPropertyChange(propertyName, newValue);
    },
    [onPropertyChange, propertyName],
  );

  return {
    value,
    errors: propertyErrors,
    disabled,
    isRaw,
    onChange,
  };
};
