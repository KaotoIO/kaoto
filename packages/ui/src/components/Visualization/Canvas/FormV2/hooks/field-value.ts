import { useContext } from 'react';
import { safeGetValue } from '../../../../../utils';
import { ModelContext } from '../providers/ModelProvider';

export const useFieldValue = <T = unknown>(propertyPath: string) => {
  const { model, onPropertyChange } = useContext(ModelContext);
  const propertyName = propertyPath.replace('#.', '');
  const value = safeGetValue(model, propertyName) as T | undefined;

  const onChange = (value: T) => {
    onPropertyChange(propertyName, value);
  };

  return {
    value,
    onChange,
  };
};
