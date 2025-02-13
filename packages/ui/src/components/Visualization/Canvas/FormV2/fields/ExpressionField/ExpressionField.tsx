import { FunctionComponent, useContext } from 'react';
import { ROOT_PATH, setValue } from '../../../../../../utils';
import { useFieldValue } from '../../hooks/field-value';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { FieldWrapper } from '../FieldWrapper';
import { AnyOfField } from '../ObjectField/AnyOfField';
import { ExpressionService } from './expression.service';
import { ExpressionFieldInner } from './ExpressionFieldInner';

export const ExpressionField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value: originalModel, onChange } = useFieldValue<Record<string, unknown>>(propName);

  const isRootExpression = schema.format === 'expression';
  const parsedModel = ExpressionService.parseExpressionModel(originalModel);

  const onExpressionChange = (propName: string, model: unknown) => {
    const localValue = parsedModel ?? {};
    setValue(localValue, propName, model);
    onChange(localValue);
  };

  if (isRootExpression) {
    return (
      <ModelContextProvider model={parsedModel} onPropertyChange={onExpressionChange}>
        {Array.isArray(schema.oneOf) && (
          <ExpressionFieldInner propName={ROOT_PATH} required={required} schemas={schema.oneOf} />
        )}
      </ModelContextProvider>
    );
  }

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="expression"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <ModelContextProvider model={parsedModel} onPropertyChange={onExpressionChange}>
        {/* AnyOf field */}
        {Array.isArray(schema.anyOf) && <AnyOfField propName={ROOT_PATH} anyOf={schema.anyOf} />}
      </ModelContextProvider>
    </FieldWrapper>
  );
};
