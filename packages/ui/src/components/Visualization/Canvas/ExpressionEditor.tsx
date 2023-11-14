import { FunctionComponent, Ref, useCallback, useContext, useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { MetadataEditor } from '../../MetadataEditor';
import { EntitiesContext } from '../../../providers';
import { CanvasNode } from './canvas.models';
import { ExpressionService } from './expression.service';

interface ExpressionEditorProps {
  selectedNode: CanvasNode;
}

export const ExpressionEditor: FunctionComponent<ExpressionEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isOpen, setIsOpen] = useState(false);
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
  const model = visualComponentSchema?.definition;
  const { language, model: expressionModel } = ExpressionService.parseExpressionModel(languageCatalogMap, model);
  const languageSchema = useMemo(() => {
    return ExpressionService.getLanguageSchema(language!);
  }, [language]);

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleOnChange = useCallback(
    (selectedLanguage: string, newExpressionModel: Record<string, unknown>) => {
      if (!model) return;
      ExpressionService.setExpressionModel(languageCatalogMap, model, selectedLanguage, newExpressionModel);
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, languageCatalogMap, model, props.selectedNode.data?.vizNode],
  );

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      setIsOpen(false);
      if (value === language!.language.modelName) return;
      handleOnChange(value as string, {});
    },
    [handleOnChange, language],
  );

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {language!.language.title}
      </MenuToggle>
    ),
    [language, isOpen, onToggleClick],
  );

  return (
    languageCatalogMap &&
    model &&
    language && (
      <Card isCompact={true} isExpanded={isExpanded}>
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Expression</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody>
            <Dropdown
              id="expression-select"
              data-testid="expression-dropdown"
              isOpen={isOpen}
              selected={language.language.modelName}
              onSelect={onSelect}
              toggle={toggle}
              isScrollable={true}
            >
              <DropdownList data-testid="expression-dropdownlist">
                {Object.values(languageCatalogMap).map((language) => {
                  return (
                    <DropdownItem
                      data-testid={`expression-dropdownitem-${language.language.modelName}`}
                      key={language.language.title}
                      value={language.language.modelName}
                      description={language.language.description}
                    >
                      {language.language.title}
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
              onChangeModel={(model) => handleOnChange(language.language.modelName, model)}
            />
          </CardBody>
        </CardExpandableContent>
      </Card>
    )
  );
};
