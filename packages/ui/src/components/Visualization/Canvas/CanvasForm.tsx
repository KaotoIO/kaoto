import { FunctionComponent, useEffect, useRef, useState } from 'react';
import { CanvasNode } from './canvas.models';
import { AutoForm, AutoFields, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { CustomAutoField } from '../../Form/CustomAutoField';
import { SchemaService } from '../../Form';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import { Title } from '@patternfly/react-core';
import { ErrorBoundary } from '../../ErrorBoundary';

interface CanvasFormProps {
  selectedNode: CanvasNode;
}

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const formRef = useRef<typeof AutoForm>();
  const schemaServiceRef = useRef(new SchemaService());

  const [schema, setSchema] = useState<JSONSchemaBridge>();
  const [model, setModel] = useState<Record<string, unknown>>();
  const [componentName, setComponentName] = useState<string | undefined>('');

  useEffect(() => {
    formRef.current?.reset();

    const visualComponentSchema = props.selectedNode.data?.vizNode?.getComponentSchema();
    console.log(props.selectedNode.data?.vizNode?.path, visualComponentSchema?.schema);

    setSchema(schemaServiceRef.current.getSchemaBridge(visualComponentSchema?.schema));
    setModel(visualComponentSchema?.definition ?? {});
    setComponentName(visualComponentSchema?.title);
  }, [props.selectedNode.data?.vizNode]);

  return schema?.schema === undefined ? null : (
    <>
      <Title headingLevel="h1">{componentName}</Title>

      <ErrorBoundary fallback={<p>This node cannot be configured yet</p>}>
        <AutoForm ref={formRef} schema={schema} model={model}>
          <AutoFields autoField={CustomAutoField} />
          <ErrorsField />
        </AutoForm>
      </ErrorBoundary>
    </>
  );
};
