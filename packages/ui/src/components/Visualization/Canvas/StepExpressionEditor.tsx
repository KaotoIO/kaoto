import { Card, CardBody, CardExpandableContent, CardHeader, CardTitle } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { CanvasNode } from './canvas.models';
import { ExpressionService } from '../../Form/expression/expression.service';
import { ExpressionEditor } from '../../Form/expression/ExpressionEditor';
import { ICamelLanguageDefinition } from '../../../models';

interface StepExpressionEditorProps {
  selectedNode: CanvasNode;
}

export const StepExpressionEditor: FunctionComponent<StepExpressionEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isExpanded, setIsExpanded] = useState(true);
  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);

  const [preparedLanguage, setPreparedLanguage] = useState<ICamelLanguageDefinition>();
  const [preparedModel, setPreparedModel] = useState<Record<string, unknown>>({});

  useEffect(() => {
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
  }, [languageCatalogMap, props.selectedNode]);

  const handleOnChange = useCallback(
    (selectedLanguage: string, newExpressionModel: Record<string, unknown>) => {
      const language = ExpressionService.getDefinitionFromModelName(languageCatalogMap, selectedLanguage);
      setPreparedLanguage(language);
      setPreparedModel(newExpressionModel);
      const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition;
      if (!model) return;
      ExpressionService.setStepExpressionModel(languageCatalogMap, model, selectedLanguage, newExpressionModel);
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, languageCatalogMap, props.selectedNode.data?.vizNode],
  );

  return (
    languageCatalogMap &&
    preparedLanguage && (
      <Card isCompact={true} isExpanded={isExpanded}>
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Expression</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'expression-config-card'}>
            <ExpressionEditor
              expressionModel={preparedModel}
              language={preparedLanguage}
              onChangeExpressionModel={handleOnChange}
            ></ExpressionEditor>
          </CardBody>
        </CardExpandableContent>
      </Card>
    )
  );
};
