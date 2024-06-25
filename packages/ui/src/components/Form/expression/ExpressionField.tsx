import { wrapField } from '@kaoto-next/uniforms-patternfly';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';
import { ICamelLanguageDefinition } from '../../../models';
import { ExpressionModalLauncher } from './ExpressionModalLauncher';
import { ExpressionService } from './expression.service';
import { getSerializedModel } from '../../../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExpressionFieldProps = HTMLFieldProps<any, HTMLDivElement>;

const ExpressionFieldComponent = (props: ExpressionFieldProps) => {
  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);
  const [preparedLanguage, setPreparedLanguage] = useState<ICamelLanguageDefinition>();
  const [preparedModel, setPreparedModel] = useState<Record<string, unknown>>({});

  const resetModel = useCallback(() => {
    const { language, model: expressionModel } = ExpressionService.parsePropertyExpressionModel(
      languageCatalogMap,
      props.value,
    );
    setPreparedLanguage(language);
    setPreparedModel(expressionModel);
  }, [languageCatalogMap, props.value]);

  useEffect(() => {
    resetModel();
  }, [resetModel]);

  const onChange = useCallback(
    (languageName: string, model: Record<string, unknown>) => {
      const language = ExpressionService.getDefinitionFromModelName(languageCatalogMap, languageName);
      setPreparedLanguage(language);
      setPreparedModel(getSerializedModel(model));
    },
    [languageCatalogMap],
  );

  const handleConfirm = useCallback(() => {
    if (preparedLanguage && preparedModel) {
      ExpressionService.setPropertyExpressionModel(
        languageCatalogMap,
        props.value,
        preparedLanguage?.model.name,
        preparedModel,
      );
      props.onChange(props.value);
    }
  }, [languageCatalogMap, preparedLanguage, preparedModel, props]);

  const handleCancel = useCallback(() => {
    resetModel();
  }, [resetModel]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const title = (props.field as any).title;
  const description = title ? `Configure expression for "${title}" parameter` : 'Configure expression';

  return wrapField(
    { ...props, description: description },
    <ExpressionModalLauncher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name={(props.field as any).name}
      title={title}
      description={description}
      language={preparedLanguage}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      model={preparedModel}
      onChange={onChange}
    />,
  );
};
export const ExpressionField = connectField(ExpressionFieldComponent);
