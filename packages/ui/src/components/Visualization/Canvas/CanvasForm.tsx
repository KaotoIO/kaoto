import { FunctionComponent, useEffect, useRef, useState } from 'react';
import { CanvasNode } from './canvas.models';
import { AutoForm, AutoFields, ErrorsField } from '@kie-tools/uniforms-patternfly';
import { CustomAutoField } from '../../Form/CustomAutoField';
import { SchemaService } from '../../Form';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';

interface CanvasFormProps {
  selectedNode: CanvasNode;
}

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const formRef = useRef<typeof AutoForm>();
  const schemaServiceRef = useRef(new SchemaService());

  const [schema, setSchema] = useState<JSONSchemaBridge>();
  const [model, setModel] = useState<Record<string, unknown>>();

  useEffect(() => {
    formRef.current?.reset();

    setModel({});
    setSchema(schemaServiceRef.current.getSchemaBridge(props.selectedNode.data?.vizNode?.getComponentSchema()?.schema));
  }, [props.selectedNode.data?.vizNode]);

  return schema?.schema === undefined ? null : (
    <AutoForm ref={formRef} schema={schema} model={model}>
      <AutoFields autoField={CustomAutoField} />
      <ErrorsField />
    </AutoForm>
  );
};
