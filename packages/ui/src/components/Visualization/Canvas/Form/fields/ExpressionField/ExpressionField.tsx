import {
  FieldProps,
  FieldWrapper,
  ModelContextProvider,
  SchemaContext,
  SchemaProvider,
  useFieldValue,
} from '@kaoto/forms';
import { isEmpty } from 'lodash';
import { FunctionComponent, Suspense, use, useContext, useMemo } from 'react';

import { ROOT_PATH, setValue } from '../../../../../../utils';
import { ErrorBoundary } from '../../../../../ErrorBoundary';
import { Loading } from '../../../../../Loading';
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
const ExpressionFieldImpl: FunctionComponent<FieldProps & { promise: Promise<string[]> }> = ({
  propName,
  required,
  promise,
}) => {
  const { schema } = useContext(SchemaContext);
  const { value: originalModel, onChange } = useFieldValue<Record<string, unknown>>(propName);
  const languageNames = use(promise);

  const isRootExpression = schema.format === 'expression';
  const parsedModel = ExpressionService.parseExpressionModel(languageNames, originalModel);
  const expressionsSchema = useMemo(() => ExpressionService.getExpressionsSchema(schema), [schema]);

  const onExpressionChange = async (propName: string, model: unknown) => {
    let localValue = parsedModel ?? {};

    await ExpressionService.updateExpressionFromModel(parsedModel, model as Record<string, unknown>, languageNames);
    let updatedValue = model;
    if (typeof model === 'string' && model.trim() === '') {
      updatedValue = undefined;
    }
    setValue(localValue, propName, updatedValue);

    if (isEmpty(localValue)) {
      localValue = undefined as unknown as Record<string, unknown>;
    }

    onChange(localValue);
  };

  /**
   * Toggles the intentional empty-string state of an expression value. This must bypass
   * `onExpressionChange`, which converts empty strings to `undefined`, so that checking the
   * "Empty" checkbox persists `expression: ''` in the model.
   */
  const onToggleEmpty = (path: string, isEmptyValue: boolean) => {
    const localValue = { ...(parsedModel ?? {}) };
    setValue(localValue, path, isEmptyValue ? '' : undefined);

    const nextModel = isEmpty(localValue) ? undefined : localValue;
    setParsedModel(nextModel);
    onChange(nextModel as unknown as Record<string, unknown>);
  };

  if (isRootExpression) {
    return (
      <ModelContextProvider model={parsedModel} onPropertyChange={onExpressionChange}>
        <SchemaProvider schema={expressionsSchema}>
          <ExpressionFieldInner propName={ROOT_PATH} required={required} onToggleEmpty={onToggleEmpty} />
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
          <ExpressionFieldInner propName={ROOT_PATH} required={required} onToggleEmpty={onToggleEmpty} />
        </SchemaProvider>
      </ModelContextProvider>
    </FieldWrapper>
  );
};

export const ExpressionField: FunctionComponent<FieldProps> = (props) => {
  const languageNamesPromise = useMemo(() => {
    return ExpressionService.getLanguageNames();
  }, []);

  return (
    <ErrorBoundary fallback={<p>Expression editor is unavailable</p>}>
      <Suspense fallback={<Loading />}>
        <ExpressionFieldImpl {...props} promise={languageNamesPromise} />
      </Suspense>
    </ErrorBoundary>
  );
};
