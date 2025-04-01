import { useContext } from 'react';
import { safeGetValue } from '../../../../../utils';
import { ModelContext } from '../providers/ModelProvider';

export const useFieldValue = <T = unknown>(propertyPath: string) => {
  const { model, errors, onPropertyChange, disabled } = useContext(ModelContext);
  const propertyName = propertyPath.replace('#.', '');
  const value = safeGetValue(model, propertyName) as T | undefined;

  const propertyErrors = errors?.[propertyPath];

  const onChange = (value: T) => {
    onPropertyChange(propertyName, value);
  };

  return {
    value,
    errors: propertyErrors,
    onChange,
    disabled,
  };
};
