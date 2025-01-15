import { useContext, useState } from 'react';
import { safeGetValue } from '../../../../../utils';
import { ModelContext } from '../providers/ModelProvider';

export const useFieldValue = <T = unknown>(propertyPath: string) => {
  const { model, onPropertyChange } = useContext(ModelContext);
  const propertyName = propertyPath.replace('#.', '');
  const modelValue: T | undefined = safeGetValue(model, propertyName);
  const [value, setValue] = useState<T | undefined>(modelValue);

  const onChange = (value: T) => {
    onPropertyChange(propertyName, value);
    setValue(value);
  };

  return {
    value,
    onChange,
  };
};
