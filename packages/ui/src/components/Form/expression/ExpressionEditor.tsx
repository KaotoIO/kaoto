import { SelectOptionProps } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { ICamelLanguageDefinition } from '../../../models';
import './ExpressionEditor.scss';
import { ExpressionService } from './expression.service';
import { TypeaheadEditor } from '../customField/TypeaheadEditor';

interface ExpressionEditorProps {
  language?: ICamelLanguageDefinition;
  expressionModel: Record<string, unknown>;
  onChangeExpressionModel: (languageName: string, model: Record<string, unknown>) => void;
}

export const ExpressionEditor: FunctionComponent<ExpressionEditorProps> = ({
  language,
  expressionModel,
  onChangeExpressionModel,
}) => {
  const languageCatalogMap: SelectOptionProps[] = useMemo(() => {
    const languageCatalog = Object.values(ExpressionService.getLanguageMap());
    return languageCatalog!.map((option) => {
      return {
        value: option.model.name,
        children: option.model.title,
        className: option.model.name,
        description: option.model.description,
      };
    });
  }, []);

  const languageOption = language && {
    name: language!.model.name,
    title: language!.model.title,
  };
  const [selectedLanguageOption, setSelectedLanguageOption] = useState<{ name: string; title: string } | undefined>(
    languageOption,
  );

  const languageSchema = useMemo(() => {
    return language && ExpressionService.getLanguageSchema(ExpressionService.setStepExpressionResultType(language));
  }, [language]);

  const handleOnChange = useCallback(
    (
      selectedLanguageOption: { name: string; title: string } | undefined,
      newlanguageModel: Record<string, unknown>,
    ) => {
      setSelectedLanguageOption(selectedLanguageOption);
      onChangeExpressionModel(selectedLanguageOption ? selectedLanguageOption!.name : '', newlanguageModel);
    },
    [languageCatalogMap],
  );

  return (
    <div className="expression-metadata-editor">
      <TypeaheadEditor
        selectOptions={languageCatalogMap}
        title="expression"
        selected={selectedLanguageOption}
        selectedModel={expressionModel}
        selectedSchema={languageSchema}
        selectionOnChange={handleOnChange}
      />
    </div>
  );
};
