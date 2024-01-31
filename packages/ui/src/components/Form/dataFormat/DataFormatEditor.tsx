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
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { DataFormatService } from './dataformat.service';
import { SchemaService } from '../schema.service';

interface DataFormatEditorProps {
  selectedNode: CanvasNode;
}

export const DataFormatEditor: FunctionComponent<DataFormatEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const dataFormatCatalogMap = useMemo(() => {
    return DataFormatService.getDataFormatMap();
  }, []);

  const visualComponentSchema = props.selectedNode.data?.vizNode?.getComponentSchema();
  if (visualComponentSchema) {
    if (!visualComponentSchema.definition) {
      visualComponentSchema.definition = {};
    }
  }
  const { dataFormat, model: dataFormatModel } = DataFormatService.parseDataFormatModel(
    dataFormatCatalogMap,
    visualComponentSchema?.definition,
  );
  const [selected, setSelected] = useState<string>(dataFormat?.model.name || '');

  useEffect(() => {
    dataFormat ? setSelected(dataFormat.model.name) : setSelected('');
  }, [dataFormat]);

  const dataFormatSchema = useMemo(() => {
    return DataFormatService.getDataFormatSchema(dataFormat);
  }, [dataFormat]);

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleOnChange = useCallback(
    (selectedDataFormat: string, newDataFormatModel: Record<string, unknown>) => {
      const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition;
      if (!model) return;
      DataFormatService.setDataFormatModel(dataFormatCatalogMap, model, selectedDataFormat, newDataFormatModel);
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, dataFormatCatalogMap, props.selectedNode.data?.vizNode],
  );

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      setIsOpen(false);
      if ((!dataFormat && value === '') || value === dataFormat?.model.name) return;
      setSelected(value as string);
      handleOnChange(value as string, {});
    },
    [handleOnChange, dataFormat],
  );

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isFullWidth isExpanded={isOpen}>
        {selected || (
          <TextContent>
            <Text component={TextVariants.small}>{SchemaService.DROPDOWN_PLACEHOLDER}</Text>
          </TextContent>
        )}
      </MenuToggle>
    ),
    [isOpen, onToggleClick, selected],
  );

  return (
    dataFormatCatalogMap && (
      <Card isCompact={true} isExpanded={isExpanded}>
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Data Format</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'dataformat-config-card'}>
            <Dropdown
              id="dataformat-select"
              data-testid="expression-dropdown"
              isOpen={isOpen}
              selected={selected !== '' ? selected : undefined}
              onSelect={onSelect}
              onOpenChange={setIsOpen}
              toggle={toggle}
              isScrollable={true}
            >
              <DropdownList data-testid="dataformat-dropdownlist">
                {Object.values(dataFormatCatalogMap).map((df) => {
                  return (
                    <DropdownItem
                      data-testid={`dataformat-dropdownitem-${df.model.name}`}
                      key={df.model.title}
                      value={df.model.name}
                      description={df.model.description}
                    >
                      {df.model.title}
                    </DropdownItem>
                  );
                })}
              </DropdownList>
            </Dropdown>
            {dataFormat && (
              <MetadataEditor
                data-testid="dataformat-editor"
                name={'dataformat'}
                schema={dataFormatSchema}
                metadata={dataFormatModel}
                onChangeModel={(model) => handleOnChange(dataFormat.model.name, model)}
              />
            )}
          </CardBody>
        </CardExpandableContent>
      </Card>
    )
  );
};
