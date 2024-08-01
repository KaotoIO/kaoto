import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  SelectOptionProps,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import {
  getRequiredPropertiesSchema,
  getSerializedModel,
  getUserUpdatedPropertiesSchema,
  isDefined,
} from '../../../utils';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { TypeaheadEditor } from '../customField/TypeaheadEditor';
import { ExpressionService } from '../expression/expression.service';
import { FormTabsModes } from '../../Visualization/Canvas/canvasformtabs.modes';

interface StepExpressionEditorProps {
  selectedNode: CanvasNode;
  formMode: FormTabsModes;
}

export const StepExpressionEditor: FunctionComponent<StepExpressionEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isExpanded, setIsExpanded] = useState(true);
  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);

  const visualComponentSchema = props.selectedNode.data?.vizNode?.getComponentSchema();
  if (visualComponentSchema) {
    if (!visualComponentSchema.definition) {
      visualComponentSchema.definition = {};
    }
  }

  const initialExpressionOptions: SelectOptionProps[] = useMemo(() => {
    return Object.values(languageCatalogMap).map((option) => {
      return {
        value: option.model.name,
        children: option.model.title,
        className: option.model.name,
        description: option.model.description,
      };
    });
  }, [languageCatalogMap]);

  const { language, model: languageModel } = ExpressionService.parseStepExpressionModel(
    languageCatalogMap,
    visualComponentSchema?.definition,
  );

  const languageOption = language && {
    name: language!.model.name,
    title: language!.model.title,
  };
  const [selectedLanguageOption, setSelectedLanguageOption] = useState<{ name: string; title: string } | undefined>(
    languageOption,
  );

  const languageSchema = useMemo(() => {
    if (!language) {
      return undefined;
    }
    return ExpressionService.getLanguageSchema(ExpressionService.setStepExpressionResultType(language));
  }, [language]);

  const processedSchema = useMemo(() => {
    if (props.formMode === FormTabsModes.REQUIRED_FIELDS) {
      return getRequiredPropertiesSchema(languageSchema ?? {});
    } else if (props.formMode === FormTabsModes.ALL_FIELDS) {
      return languageSchema;
    } else if (props.formMode === FormTabsModes.USER_MODIFIED) {
      return {
        ...languageSchema,
        properties: getUserUpdatedPropertiesSchema(languageSchema?.properties ?? {}, languageModel ?? {}),
      };
    }
  }, [props.formMode, language]);

  const handleOnChange = useCallback(
    (
      selectedLanguageOption: { name: string; title: string } | undefined,
      newlanguageModel: Record<string, unknown>,
    ) => {
      const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition;
      if (!model) return;

      setSelectedLanguageOption(selectedLanguageOption);
      ExpressionService.setStepExpressionModel(
        languageCatalogMap,
        model,
        selectedLanguageOption ? selectedLanguageOption!.name : '',
        getSerializedModel(newlanguageModel),
      );
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [languageCatalogMap, props.selectedNode.data?.vizNode?.getComponentSchema()?.definition, entitiesContext],
  );

  const showEditor = useMemo(() => {
    if (props.formMode === FormTabsModes.ALL_FIELDS || props.formMode === FormTabsModes.REQUIRED_FIELDS) return true;
    return props.formMode === FormTabsModes.USER_MODIFIED && isDefined(selectedLanguageOption);
  }, [props.formMode]);

  if (!showEditor) return null;

  return (
    <div className="expression-metadata-editor">
      <Card isCompact={true} isExpanded={isExpanded} className="expression-metadata-editor-card">
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Expression</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'expression-config-card'}>
            <TypeaheadEditor
              selectOptions={initialExpressionOptions}
              title="expression"
              selected={selectedLanguageOption}
              selectedModel={languageModel}
              selectedSchema={processedSchema}
              selectionOnChange={handleOnChange}
            />
          </CardBody>
        </CardExpandableContent>
      </Card>
    </div>
  );
};
