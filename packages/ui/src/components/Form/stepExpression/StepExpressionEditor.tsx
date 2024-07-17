import { wrapField } from '@kaoto-next/uniforms-patternfly';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ICamelLanguageDefinition } from '../../../models';
import { EntitiesContext } from '../../../providers';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { ExpressionService } from '..//expression/expression.service';
import { ExpressionModalLauncher } from '../expression/ExpressionModalLauncher';
import { getSerializedModel, isDefined } from '../../../utils';
import { FormTabsModes } from '../../Visualization/Canvas/canvasformtabs.modes';

interface StepExpressionEditorProps {
  selectedNode: CanvasNode;
  formMode: FormTabsModes;
}

export const StepExpressionEditor: FunctionComponent<StepExpressionEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);

  const [preparedLanguage, setPreparedLanguage] = useState<ICamelLanguageDefinition>();
  const [preparedModel, setPreparedModel] = useState<Record<string, unknown> | undefined>({});

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
      setPreparedModel(getSerializedModel(newExpressionModel));
    },
    [languageCatalogMap],
  );

  const handleConfirm = useCallback(() => {
    const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition || {};
    if (preparedLanguage && preparedModel) {
      ExpressionService.setStepExpressionModel(languageCatalogMap, model, preparedLanguage.model.name, preparedModel);
    } else {
      ExpressionService.deleteStepExpressionModel(model);
    }
    props.selectedNode.data?.vizNode?.updateModel(model);
    entitiesContext?.updateSourceCodeFromEntities();
  }, [entitiesContext, languageCatalogMap, preparedLanguage, preparedModel, props.selectedNode.data?.vizNode]);

  const handleCancel = useCallback(() => {
    resetModel();
  }, [resetModel]);
  const title = props.selectedNode.label;
  const description = title ? `Configure expression for "${title}" parameter` : 'Configure expression';

  const showEditor = useMemo(() => {
    if (props.formMode === FormTabsModes.ALL_FIELDS) return true;
    return props.formMode === FormTabsModes.USER_MODIFIED && isDefined(preparedLanguage);
  }, [props.formMode]);

  if (!showEditor) return null;

  return (
    languageCatalogMap && (
      <div className="expression-field pf-v5-c-form">
        {wrapField(
          { ...props, label: 'Expression', id: 'expression-wrapper', description: description },
          <ExpressionModalLauncher
            name={props.selectedNode.id}
            title={title}
            description={description}
            language={preparedLanguage}
            model={preparedModel}
            onChange={handleOnChange}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />,
        )}
      </div>
    )
  );
};
