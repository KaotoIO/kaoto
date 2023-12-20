import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { CanvasNode } from './canvas.models';
import { ExpressionService } from '../../Form/expression/expression.service';
import { ICamelLanguageDefinition } from '../../../models';
import { ExpressionModalLauncher } from '../../Form/expression/ExpressionModalLauncher';

interface StepExpressionEditorProps {
  selectedNode: CanvasNode;
}

export const StepExpressionEditor: FunctionComponent<StepExpressionEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);

  const [preparedLanguage, setPreparedLanguage] = useState<ICamelLanguageDefinition>();
  const [preparedModel, setPreparedModel] = useState<Record<string, unknown>>({});

  const resetModel = useCallback(() => {
    const visualComponentSchema = props.selectedNode.data?.vizNode?.getComponentSchema();
    if (visualComponentSchema) {
      if (!visualComponentSchema.definition) {
        visualComponentSchema.definition = {};
      }
    }
    const { language, model: expressionModel } = ExpressionService.parseStepExpressionModel(
      languageCatalogMap,
      visualComponentSchema?.definition,
    );
    setPreparedLanguage(language);
    setPreparedModel(expressionModel);
  }, [languageCatalogMap, props.selectedNode.data?.vizNode]);

  useEffect(() => {
    resetModel();
  }, [resetModel]);

  const handleOnChange = useCallback(
    (selectedLanguage: string, newExpressionModel: Record<string, unknown>) => {
      const language = ExpressionService.getDefinitionFromModelName(languageCatalogMap, selectedLanguage);
      setPreparedLanguage(language);
      setPreparedModel(newExpressionModel);
    },
    [languageCatalogMap],
  );

  const handleConfirm = useCallback(() => {
    const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition || {};
    if (preparedLanguage && preparedModel) {
      ExpressionService.setStepExpressionModel(languageCatalogMap, model, preparedLanguage.model.name, preparedModel);
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    }
  }, [entitiesContext, languageCatalogMap, preparedLanguage, preparedModel, props.selectedNode.data?.vizNode]);

  const handleCancel = useCallback(() => {
    resetModel();
  }, [resetModel]);

  return (
    languageCatalogMap && (
      <ExpressionModalLauncher
        name={props.selectedNode.id}
        title={props.selectedNode.label}
        language={preparedLanguage}
        model={preparedModel}
        onChange={handleOnChange}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  );
};
