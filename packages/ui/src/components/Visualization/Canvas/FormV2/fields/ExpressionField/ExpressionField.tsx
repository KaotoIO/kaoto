import { FunctionComponent, useContext, useMemo } from 'react';
import { ROOT_PATH, setValue } from '../../../../../../utils';
import { useFieldValue } from '../../hooks/field-value';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { FieldWrapper } from '../FieldWrapper';
import { ExpressionService } from './expression.service';
import { ExpressionFieldInner } from './ExpressionFieldInner';

/**
 * ExpressionField component.
 *
 * This component is reponsible for parsing the different expression models and rendering the ExpressionField.
 * There are two types of expression fields:
 * - Root expression field: Like the one in setHeader, resequencer, etc.
 * - Property expression field: Like the one in aggregate.correlationExpression, etc.
 *
 * For the root expressions, the components path is like follows:
 * - ObjectField -> AnyOfField -> FormComponentFactoryProvider -> ExpressionField
 * this brings `oneOf` fields to the root level.
 *
 * For the property expressions, the components path is like follows:
 * - ObjectField -> property resolution -> FormComponentFactoryProvider -> ExpressionField
 * this brings an entire schema with a `anyOf` array where the languages are specified.
 */
export const ExpressionField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value: originalModel, onChange } = useFieldValue<Record<string, unknown>>(propName);

  const isRootExpression = schema.format === 'expression';
  const parsedModel = ExpressionService.parseExpressionModel(originalModel);
  const expressionsSchema = useMemo(() => ExpressionService.getExpressionsSchema(schema), [schema]);

  const onExpressionChange = (propName: string, model: unknown) => {
    const localValue = parsedModel ?? {};
    setValue(localValue, propName, model);
    onChange(localValue);
  };

  if (isRootExpression) {
    return (
      <ModelContextProvider model={parsedModel} onPropertyChange={onExpressionChange}>
        <SchemaProvider schema={expressionsSchema}>
          <ExpressionFieldInner propName={ROOT_PATH} required={required} />
        </SchemaProvider>
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
        <SchemaProvider schema={expressionsSchema}>
          <ExpressionFieldInner propName={ROOT_PATH} required={required} />
        </SchemaProvider>
      </ModelContextProvider>
    </FieldWrapper>
  );
};
