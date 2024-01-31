import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useMemo, useState } from 'react';
import { MetadataEditor } from '../../MetadataEditor';
import { ExpressionService } from './expression.service';
import { ICamelLanguageDefinition } from '../../../models';
import { SchemaService } from '../schema.service';

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
  const [selected, setSelected] = useState<string>(language?.model.name || '');

  const languageSchema = useMemo(() => {
    return language && ExpressionService.getLanguageSchema(language);
  }, [language]);

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      setIsOpen(false);
      if ((!language && value === '') || value === language?.model.name) return;
      setSelected(value as string);
      onChangeExpressionModel(value as string, {});
    },
    [onChangeExpressionModel, language],
  );

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {language?.model.title || (
          <TextContent>
            <Text component={TextVariants.small}>{SchemaService.DROPDOWN_PLACEHOLDER}</Text>
          </TextContent>
        )}
      </MenuToggle>
    ),
    [onToggleClick, isOpen, language],
  );

  return (
    languageCatalogMap && (
      <>
        <Dropdown
          id="expression-select"
          data-testid="expression-dropdown"
          isOpen={isOpen}
          selected={selected !== '' ? selected : undefined}
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
        {language && (
          <MetadataEditor
            data-testid="expression-editor"
            name={'expression'}
            schema={languageSchema}
            metadata={expressionModel}
            onChangeModel={(model) => onChangeExpressionModel(language.model.name, model)}
          />
        )}
      </>
    )
  );
};
