import { Split, SplitItem, Stack, StackItem, Title } from '@patternfly/react-core';
import cloneDeep from 'lodash/cloneDeep';
import { FunctionComponent, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import { SchemaService } from '../Form';
import { CustomAutoForm, CustomAutoFormRef } from '../Form/CustomAutoForm';
import './MetadataEditor.scss';
import { TopmostArrayTable } from './TopmostArrayTable';

interface MetadataEditorProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChangeModel: (model: any) => void;
}

export const MetadataEditor: FunctionComponent<PropsWithChildren<MetadataEditorProps>> = (props) => {
  const schemaServiceRef = useRef(new SchemaService());
  const [schemaBridge, setSchemaBridge] = useState<JSONSchemaBridge | undefined>(
    schemaServiceRef.current.getSchemaBridge(getFormSchema()),
  );
  const fieldsRefs = useRef<CustomAutoFormRef>(null);
  const [selected, setSelected] = useState(-1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preparedModel, setPreparedModel] = useState<any>(null);

  useEffect(() => {
    setSchemaBridge(schemaServiceRef.current.getSchemaBridge(getFormSchema()));
  }, [props.schema]);

  useEffect(() => {
    // The input like checkbox doesn't have focus() method
    fieldsRefs.current?.fields[0]?.focus?.();
  }, [selected]);

  function isTopmostArray() {
    return props.schema.type === 'array' && props.schema.items !== undefined;
  }

  function isFormDisabled() {
    if (!isTopmostArray()) {
      return false;
    }
    const targetModel = preparedModel != null ? preparedModel : props.metadata;
    return !targetModel || selected === -1 || selected > targetModel?.length - 1;
  }

  function getFormSchema() {
    if (isTopmostArray()) {
      let itemSchema = cloneDeep(props.schema.items);
      if (itemSchema.$ref) {
        itemSchema = cloneDeep(props.schema.definitions[itemSchema.$ref.replace('#/definitions/', '')]);
      }
      itemSchema.title = props.schema.title;
      itemSchema.description = props.schema.description;
      itemSchema.definitions = props.schema.definitions;
      return itemSchema;
    }
    return props.schema;
  }

  function getFormModel() {
    if (isTopmostArray()) {
      const targetModel = preparedModel != null ? preparedModel : props.metadata?.slice();
      return targetModel && selected !== -1 ? targetModel[selected] : undefined;
    } else {
      return preparedModel != null ? preparedModel : { ...props.metadata };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onChangeFormModel(model: any) {
    if (isTopmostArray()) {
      const newMetadata = props.metadata ? props.metadata.slice() : [];
      const newPreparedModel = preparedModel ? preparedModel.slice() : newMetadata;
      newPreparedModel[selected] = model;
      setPreparedModel(newPreparedModel);
      props.onChangeModel(newPreparedModel);
    } else {
      const newModel = typeof model === `object` ? { ...model } : model;
      setPreparedModel(newModel);
      props.onChangeModel(newModel);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onChangeArrayModel(model: any[]) {
    setPreparedModel(model);
    props.onChangeModel(model);
  }

  return (
    <>
      {isTopmostArray() ? (
        <Split hasGutter>
          <SplitItem className="metadata-editor-modal-list-view">
            <TopmostArrayTable
              model={preparedModel != null ? preparedModel : props.metadata}
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
                <CustomAutoForm
                  schemaBridge={schemaBridge}
                  model={getFormModel()}
                  onChangeModel={onChangeFormModel}
                  data-testid={`metadata-editor-form-${props.name}`}
                  disabled={isFormDisabled()}
                  sortFields={true}
                  ref={fieldsRefs}
                />
              </StackItem>
            </Stack>
          </SplitItem>
        </Split>
      ) : (
        <CustomAutoForm
          schemaBridge={schemaBridge}
          model={getFormModel()}
          onChangeModel={onChangeFormModel}
          data-testid={`metadata-editor-form-${props.name}`}
          disabled={isFormDisabled()}
          sortFields={true}
          ref={fieldsRefs}
        />
      )}
    </>
  );
};
