import { Dropdown, DropdownItem, DropdownList, MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useMemo, useState } from 'react';
import { MetadataEditor } from '../../MetadataEditor';
import { ExpressionService } from './expression.service';
import { ICamelLanguageDefinition } from '../../../models';

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
  const [isOpen, setIsOpen] = useState(false);
  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);

  const selectedLanguage = language || ExpressionService.getDefaultLanguage(languageCatalogMap);
  const languageSchema = useMemo(() => {
    return selectedLanguage && ExpressionService.getLanguageSchema(selectedLanguage);
  }, [selectedLanguage]);

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      setIsOpen(false);
      if (value === selectedLanguage!.model.name) return;
      onChangeExpressionModel(value as string, {});
    },
    [onChangeExpressionModel, selectedLanguage],
  );

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {selectedLanguage!.model.title}
      </MenuToggle>
    ),
    [onToggleClick, isOpen, selectedLanguage],
  );

  return (
    languageCatalogMap &&
    selectedLanguage && (
      <>
        <Dropdown
          id="expression-select"
          data-testid="expression-dropdown"
          isOpen={isOpen}
          selected={selectedLanguage.model.name}
          onSelect={onSelect}
          onOpenChange={setIsOpen}
          toggle={toggle}
          isScrollable={true}
        >
          <DropdownList data-testid="expression-dropdownlist">
            {Object.values(languageCatalogMap).map((lang) => {
              return (
                <DropdownItem
                  data-testid={`expression-dropdownitem-${lang.model.name}`}
                  key={lang.model.title}
                  value={lang.model.name}
                  description={lang.model.description}
                >
                  {lang.model.title}
                </DropdownItem>
              );
            })}
          </DropdownList>
        </Dropdown>
        <MetadataEditor
          data-testid="expression-editor"
          name={'expression'}
          schema={languageSchema}
          metadata={expressionModel}
          onChangeModel={(model) => onChangeExpressionModel(selectedLanguage.model.name, model)}
        />
      </>
    )
  );
};
