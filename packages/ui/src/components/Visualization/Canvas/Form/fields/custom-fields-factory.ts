import { CustomFieldsFactory } from '@kaoto/forms';
import { BeanField } from './BeanField/BeanField';
import { ExpressionField } from './ExpressionField/ExpressionField';

export const customFieldsFactoryfactory: CustomFieldsFactory = (schema) => {
  if (schema.type === 'string' && schema.format?.startsWith('bean:')) {
    return BeanField;
  } else if (schema.format === 'expression' || schema.format === 'expressionProperty') {
    return ExpressionField;
  }

  return undefined;
};
