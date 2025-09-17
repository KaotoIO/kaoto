import { CustomFieldsFactory } from '@kaoto/forms';
import { PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { ExpressionField } from './ExpressionField/ExpressionField';

export const customFieldsFactoryfactory: CustomFieldsFactory = (schema) => {
  if (schema.type === 'string' && schema.format?.startsWith('bean:')) {
    return PrefixedBeanField;
  } else if (schema.type === 'string' && schema.title === 'Ref') {
    return UnprefixedBeanField;
  } else if (schema.format === 'expression' || schema.format === 'expressionProperty') {
    return ExpressionField;
  }

  return undefined;
};
