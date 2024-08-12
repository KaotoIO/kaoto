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
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import './DataFormatEditor.scss';
import { DataFormatService } from './dataformat.service';
import { TypeaheadEditor } from '../customField/TypeaheadEditor';
import {
  getRequiredPropertiesSchema,
  getSerializedModel,
  getUserUpdatedPropertiesSchema,
  isDefined,
} from '../../../utils';
import { FormTabsModes } from '../../Visualization/Canvas/canvasformtabs.modes';

interface DataFormatEditorProps {
  selectedNode: CanvasNode;
  formMode: FormTabsModes;
}

export const DataFormatEditor: FunctionComponent<DataFormatEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isExpanded, setIsExpanded] = useState(true);
  const dataFormatCatalogMap = useMemo(() => {
    return DataFormatService.getDataFormatMap();
  }, []);

  const initialDataFormatOptions: SelectOptionProps[] = useMemo(() => {
    return Object.values(dataFormatCatalogMap).map((option) => {
      return {
        value: option.model.name,
        children: option.model.title,
        description: option.model.description,
      };
    });
  }, [dataFormatCatalogMap]);

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
  const dataFormatOption = dataFormat && {
    name: dataFormat!.model.name,
    title: dataFormat!.model.title,
  };
  const [selectedDataFormatOption, setSelectedDataFormatOption] = useState<{ name: string; title: string } | undefined>(
    dataFormatOption,
  );

  const dataFormatSchema = useMemo(() => {
    return DataFormatService.getDataFormatSchema(dataFormat);
  }, [dataFormat]);

  const processedSchema = useMemo(() => {
    if (props.formMode === FormTabsModes.REQUIRED_FIELDS) {
      return getRequiredPropertiesSchema(dataFormatSchema ?? {});
    } else if (props.formMode === FormTabsModes.ALL_FIELDS) {
      return dataFormatSchema;
    } else if (props.formMode === FormTabsModes.USER_MODIFIED) {
      return {
        ...dataFormatSchema,
        properties: getUserUpdatedPropertiesSchema(dataFormatSchema?.properties ?? {}, dataFormatModel ?? {}),
      };
    }
  }, [props.formMode, dataFormat]);

  const handleOnChange = useCallback(
    (
      selectedDataFormatOption: { name: string; title: string } | undefined,
      newDataFormatModel: Record<string, unknown>,
    ) => {
      setSelectedDataFormatOption(selectedDataFormatOption);
      const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition;
      if (!model) return;
      DataFormatService.setDataFormatModel(
        dataFormatCatalogMap,
        model,
        selectedDataFormatOption ? selectedDataFormatOption!.name : '',
        getSerializedModel(newDataFormatModel),
      );
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, dataFormatCatalogMap, props.selectedNode.data?.vizNode],
  );

  const showEditor = useMemo(() => {
    if (props.formMode === FormTabsModes.ALL_FIELDS || props.formMode === FormTabsModes.REQUIRED_FIELDS) return true;
    return props.formMode === FormTabsModes.USER_MODIFIED && isDefined(selectedDataFormatOption);
  }, [props.formMode]);

  if (!showEditor) return null;

  return (
    <div className="dataformat-metadata-editor">
      <Card isCompact={true} isExpanded={isExpanded} className="dataformat-metadata-editor-card">
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Data Format</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'dataformat-config-card'}>
            <TypeaheadEditor
              selectOptions={initialDataFormatOptions}
              title="dataformat"
              selected={selectedDataFormatOption}
              selectedModel={dataFormatModel}
              selectedSchema={processedSchema}
              selectionOnChange={handleOnChange}
            />
          </CardBody>
        </CardExpandableContent>
      </Card>
    </div>
  );
};
