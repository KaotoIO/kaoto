import {createElement, FunctionComponent, PropsWithChildren, useEffect, useRef, useState} from 'react';
import {Split, SplitItem, Stack, StackItem, Title} from "@patternfly/react-core";
import {TopmostArrayTable} from "./ToopmostArrayTable.tsx";
import {ErrorsField} from "@kaoto-next/uniforms-patternfly";
import {AutoForm} from "uniforms";
import {CustomAutoField} from "../Form/CustomAutoField.tsx";
import {SchemaService} from "../Form";
import {JSONSchemaBridge} from "uniforms-bridge-json-schema";
import cloneDeep from "lodash/cloneDeep";

interface MetadataEditorProps {
  name: string;
  schema: any;
  metadata: any;
  onChangeModel: (model: any) => void;
}

export const MetadataEditor: FunctionComponent<PropsWithChildren<MetadataEditorProps>> = (props) => {
  const schemaServiceRef = useRef(new SchemaService());
  const [schemaBridge, setSchemaBridge] =
    useState<JSONSchemaBridge | undefined>(schemaServiceRef.current.getSchemaBridge(getFormSchema()));
  const firstInputRef = useRef<HTMLInputElement>();
  const [selected, setSelected] = useState(-1);
  const [preparedModel, setPreparedModel] = useState<any>(null);

  useEffect(() => {
    setSchemaBridge(schemaServiceRef.current.getSchemaBridge(getFormSchema()));
  }, [props.schema]);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, [selected]);

  function isTopmostArray() {
    return props.schema.type === 'array' && props.schema.items;
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
        itemSchema =cloneDeep(props.schema.definitions[itemSchema.$ref.replace('#/definitions/', '')]);
      }
      itemSchema.title = props.schema.title;
      itemSchema.description = props.schema.description;
      itemSchema.definitions = props.schema.definitions;
      return itemSchema;
    }
    return props.schema;
  }

  function getFormModel() {
    const targetModel = preparedModel != null ? preparedModel : props.metadata?.slice();
    if (isTopmostArray()) {
      return targetModel && selected !== -1 ? targetModel[selected] : undefined;
    }
    return targetModel;
  }

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

  function onChangeArrayModel(model: any[]) {
    setPreparedModel(model);
    props.onChangeModel(model);
  }

  function handleSetSelected(index: number) {
    setSelected(index);
  }

  function renderTopmostArrayView() {
    return (
        <Split hasGutter>
          <SplitItem className="metadataEditorModalListView">
            <TopmostArrayTable
                model={preparedModel != null ? preparedModel : props.metadata}
                itemSchema={getFormSchema()}
                name={props.name}
                selected={selected}
                onSelected={handleSetSelected}
                onChangeModel={onChangeArrayModel}
            />
          </SplitItem>

          <SplitItem className="metadataEditorModalDetailsView">
            <Stack hasGutter>
              <StackItem>
                <Title headingLevel="h2">Details</Title>
              </StackItem>
              <StackItem isFilled>{renderDetailsForm()}</StackItem>
            </Stack>
          </SplitItem>
        </Split>
    );
  }

  function renderAutoFields(props: any = {}) {
    return createElement(
        'div',
        props,
        schemaBridge!.getSubfields()
          .sort((a, b) => {
            const propsA = schemaBridge!.getProps(a);
            const propsB = schemaBridge!.getProps(b);
            if (propsA.required) {
              return propsB.required ? 0 : -1;
            }
            return propsB.required ? 1 : 0;
          })
          .map((field, index) => {
            const props: any = { key: field, name: field };
            if (index === 0) {
              props.inputRef = firstInputRef;
            }
            return createElement(CustomAutoField, props);
          })
    );
  }

  function renderDetailsForm() {
    return schemaBridge && (
        <AutoForm
            schema={schemaBridge}
            model={getFormModel()}
            onChangeModel={onChangeFormModel}
            data-testid={'metadata-editor-form-' + props.name}
            placeholder={true}
            disabled={isFormDisabled()}
        >
          {renderAutoFields()}
          <ErrorsField />
          <br />
        </AutoForm>
    );
  }

  return schemaBridge && (
      <>
          {isTopmostArray() ? renderTopmostArrayView() : renderDetailsForm()}
      </>
  );
};
