import { Split, SplitItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { cloneDeep } from 'lodash';
import { FunctionComponent, useMemo, useState } from 'react';
import './MetadataEditor.scss';
import { TopmostArrayTable } from './TopmostArrayTable';
import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../../providers/canvas-form-tabs.provider';
import { KaotoForm } from '../Visualization/Canvas/FormV2/KaotoForm';

interface MetadataEditorProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChangeModel: (model: any) => void;
}

export const MetadataEditor: FunctionComponent<MetadataEditorProps> = (props) => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(() => ({ selectedTab: 'All', onTabChange: () => {} }), []);
  const [selected, setSelected] = useState(-1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preparedModel, setPreparedModel] = useState<any>(null);

  function isFormDisabled() {
    const targetModel = preparedModel != null ? preparedModel : props.metadata;
    return !targetModel || selected === -1 || selected > targetModel?.length - 1;
  }

  function getFormSchema() {
    const itemSchema = cloneDeep(props.schema.items);
    return itemSchema;
  }

  function getFormModel() {
    const targetModel = preparedModel != null ? preparedModel : props.metadata?.slice();
    return targetModel && selected !== -1 ? targetModel[selected] : undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onChangeFormModel(model: any) {
    const newMetadata = props.metadata ? props.metadata.slice() : [];
    const newPreparedModel = preparedModel ? preparedModel.slice() : newMetadata;
    newPreparedModel[selected] = model;
    setPreparedModel(newPreparedModel);
    props.onChangeModel(newPreparedModel);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onChangeArrayModel(model: any[]) {
    setPreparedModel(model);
    props.onChangeModel(model);
  }

  return (
    <Split hasGutter>
      <SplitItem className="metadata-editor-modal-list-view">
        <TopmostArrayTable
          model={preparedModel !== null ? preparedModel : props.metadata}
          itemSchema={getFormSchema()}
          name={props.name}
          selected={selected}
          onSelected={setSelected}
          onChangeModel={onChangeArrayModel}
        />
      </SplitItem>

      <SplitItem className="metadata-editor-modal-details-view">
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h2">Details</Title>
          </StackItem>
          <StackItem isFilled>
            <CanvasFormTabsContext.Provider value={formTabsValue}>
              <KaotoForm
                key={`metadata-editor-form-${selected}`}
                data-testid="metadata-editor-form-Beans"
                schema={getFormSchema()}
                model={getFormModel()}
                onChange={onChangeFormModel}
                disabled={isFormDisabled()}
              />
            </CanvasFormTabsContext.Provider>
          </StackItem>
        </Stack>
      </SplitItem>
    </Split>
  );
};
