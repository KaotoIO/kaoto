import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { ROOT_PATH, setValue } from '../../../../../../utils';
import { useFieldValue } from '../../hooks/field-value';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { FieldWrapper } from '../FieldWrapper';
import { AnyOfField } from '../ObjectField/AnyOfField';
import { ExpressionService } from './expression.service';

export const ExpressionField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value: originalModel, onChange } = useFieldValue<Record<string, unknown>>(propName);

  const isRootExpression = schema.format === 'expression';
  const parsedModel = isRootExpression
    ? ExpressionService.parseStepExpressionModel(originalModel)
    : ExpressionService.parsePropertyExpressionModel(originalModel);

  const onExpressionChange = useCallback(
    (propName: string, model: unknown) => {
      const localValue = originalModel ?? {};
      setValue(localValue, propName, model);
      onChange(localValue);
    },
    [onChange, originalModel],
  );

  const expressionAnyOfSchemas = useMemo(() => {
    /** This is usually when a property it's a expression, like `aggregate.correlationExpression` */
    if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
      return schema.anyOf;
    }

    /** This is usually when an EIP or an Entity has a root expression, like `setHeader`, `resequence` or `onCompletion` */
    if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
      return [{ oneOf: schema.oneOf }];
    }

    return undefined;
  }, [schema.anyOf, schema.oneOf]);

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
        {Array.isArray(expressionAnyOfSchemas) && <AnyOfField propName={ROOT_PATH} anyOf={expressionAnyOfSchemas} />}
      </ModelContextProvider>
    </FieldWrapper>
  );
};
