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
import { getSerializedModel } from '../../../utils';
import { TypeaheadEditor } from '../customField/TypeaheadEditor';
import './ExpressionEditor.scss';
import { ExpressionService } from './expression.service';

interface ExpressionEditorProps {
  expressionModel: Record<string, unknown>;
  onChangeExpressionModel: (model: Record<string, unknown>) => void;
}

export const ExpressionEditor: FunctionComponent<ExpressionEditorProps> = ({
  expressionModel,
  onChangeExpressionModel,
}) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isExpanded, setIsExpanded] = useState(true);

  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);

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
    expressionModel,
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

  const handleOnChange = useCallback(
    (
      selectedLanguageOption: { name: string; title: string } | undefined,
      newlanguageModel: Record<string, unknown>,
    ) => {
      setSelectedLanguageOption(selectedLanguageOption);
      ExpressionService.setStepExpressionModel(
        languageCatalogMap,
        expressionModel,
        selectedLanguageOption ? selectedLanguageOption!.name : '',
        getSerializedModel(newlanguageModel),
      );
      onChangeExpressionModel(expressionModel);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [languageCatalogMap, expressionModel, entitiesContext],
  );

  return (
    <>
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
              selectedSchema={languageSchema}
              selectionOnChange={handleOnChange}
            />
          </CardBody>
        </CardExpandableContent>
      </Card>
    </>
  );
};
