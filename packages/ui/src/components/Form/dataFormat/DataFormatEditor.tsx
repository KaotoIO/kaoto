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
import { FunctionComponent, Ref, useCallback, useContext, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { DataFormatService } from './dataformat.service';

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
  const dataFormatSchema = useMemo(() => {
    return DataFormatService.getDataFormatSchema(dataFormat!);
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
      if (value === dataFormat!.model.name) return;
      handleOnChange(value as string, {});
    },
    [handleOnChange, dataFormat],
  );

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {dataFormat!.model.title}
      </MenuToggle>
    ),
    [dataFormat, isOpen, onToggleClick],
  );

  return (
    dataFormatCatalogMap &&
    dataFormat && (
      <Card isCompact={true} isExpanded={isExpanded}>
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>DataFormat</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'dataformat-config-card'}>
            <Dropdown
              id="dataformat-select"
              data-testid="expression-dropdown"
              isOpen={isOpen}
              selected={dataFormat.model.name}
              onSelect={onSelect}
              onOpenChange={setIsOpen}
              toggle={toggle}
              isScrollable={true}
            >
              <DropdownList data-testid="dataformat-dropdownlist">
                {Object.values(dataFormatCatalogMap).map((dataFormat) => {
                  return (
                    <DropdownItem
                      data-testid={`dataformat-dropdownitem-${dataFormat.model.name}`}
                      key={dataFormat.model.title}
                      value={dataFormat.model.name}
                      description={dataFormat.model.description}
                    >
                      {dataFormat.model.title}
                    </DropdownItem>
                  );
                })}
              </DropdownList>
            </Dropdown>
            <MetadataEditor
              data-testid="dataformat-editor"
              name={'dataformat'}
              schema={dataFormatSchema}
              metadata={dataFormatModel}
              onChangeModel={(model) => handleOnChange(dataFormat.model.name, model)}
            />
          </CardBody>
        </CardExpandableContent>
      </Card>
    )
  );
};
