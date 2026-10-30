import './BeanEditor.scss';

import { Stack } from '@carbon/react';
import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm } from '@kaoto/forms';
import { cloneDeep } from 'lodash';
import { FunctionComponent, useMemo, useState } from 'react';

import { useKeyedModal } from '../../../components/EditorShell';
import { ResizableSplitPanels } from '../../../components/ResizableSplitPanels/ResizableSplitPanels';
import { BeanAddModal } from './BeanAddModal';
import { BeanTreeList } from './BeanTreeList';

export interface BeanEditorProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChangeModel: (model: any) => void;
}

export const BeanEditor: FunctionComponent<BeanEditorProps> = (props) => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const [selected, setSelected] = useState(-1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preparedModel, setPreparedModel] = useState<any>(null);
  const addModal = useKeyedModal();

  const itemSchema = useMemo(() => cloneDeep(props.schema?.items), [props.schema]);
  const required: string[] = itemSchema?.required ?? [];
  const nameKey = required[0] ?? 'name';

  function hasSelectedBean() {
    const targetModel = preparedModel ?? props.metadata;
    return !!targetModel && selected !== -1 && selected <= targetModel.length - 1;
  }

  function getFormModel() {
    const targetModel = preparedModel ?? props.metadata?.slice();
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

  function handleAddBean(bean: Record<string, string>) {
    const newModel = preparedModel ?? (props.metadata ? props.metadata.slice() : []);
    const updated = [...newModel, bean];
    onChangeArrayModel(updated);
    setSelected(updated.length - 1);
  }

  function handleDeleteBean() {
    const currentModel = preparedModel ?? (props.metadata ? props.metadata.slice() : []);
    const updated = currentModel.filter((_: unknown, i: number) => i !== selected);
    onChangeArrayModel(updated);
    setSelected(-1);
  }

  return (
    <>
      <ResizableSplitPanels
        defaultLeftWidth={30}
        leftPanelLabel="Beans list"
        rightPanelLabel="Bean details"
        leftPanel={
          <div className="metadata-editor-modal-list-view">
            <BeanTreeList
              model={preparedModel === null ? props.metadata : preparedModel}
              required={required}
              name={props.name}
              selected={selected}
              onSelected={setSelected}
              onAddBean={addModal.open}
              onDeleteBean={handleDeleteBean}
            />
          </div>
        }
        rightPanel={
          <div className="metadata-editor-modal-details-view">
            {hasSelectedBean() ? (
              <Stack gap={5}>
                <div className="bean-editor__title" data-testid="bean-editor-title">
                  <span>Edit </span>
                  <span>{getFormModel()?.[nameKey]}</span>
                </div>
                <CanvasFormTabsContext.Provider value={formTabsValue}>
                  <KaotoForm
                    key={`metadata-editor-form-${selected}`}
                    data-testid="metadata-editor-form-Beans"
                    schema={itemSchema}
                    model={getFormModel()}
                    onChange={onChangeFormModel}
                  />
                </CanvasFormTabsContext.Provider>
              </Stack>
            ) : (
              <div data-testid="metadata-editor-empty-details">Select a bean from the list to edit its details</div>
            )}
          </div>
        }
      />

      {addModal.shouldRender && (
        <BeanAddModal
          key={addModal.modalKey}
          open={addModal.isOpen}
          schema={itemSchema}
          onClose={addModal.close}
          onAddBean={handleAddBean}
        />
      )}
    </>
  );
};
