import { AutoFields, AutoForm, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from '../../ErrorBoundary';
import { SchemaService } from '../../Form';
import { CustomAutoField } from '../../Form/CustomAutoField';
import { CanvasNode } from './canvas.models';

interface CanvasFormProps {
  selectedNode: CanvasNode;
}

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const formRef = useRef<typeof AutoForm>();
  const schemaServiceRef = useRef(new SchemaService());

  const [schema, setSchema] = useState<ReturnType<SchemaService['getSchemaBridge']>>();
  const [model, setModel] = useState<Record<string, unknown>>();
  const [componentName, setComponentName] = useState<string | undefined>('');

  useEffect(() => {
    formRef.current?.reset();

    const visualComponentSchema = props.selectedNode.data?.vizNode?.getComponentSchema();
    console.log('visualComponentSchema', visualComponentSchema);

    setSchema(schemaServiceRef.current.getSchemaBridge(visualComponentSchema?.schema));
    setModel(visualComponentSchema?.definition ?? {});
    setComponentName(visualComponentSchema?.title);
  }, [props.selectedNode.data?.vizNode]);

  const handleOnChange = useCallback((newModel: Record<string, unknown>) => {
    setModel(newModel);
  }, []);

  return schema?.schema === undefined ? null : (
    <ErrorBoundary fallback={<p>This node cannot be configured yet</p>}>
      <Title headingLevel="h1">{componentName}</Title>

      <AutoForm ref={formRef} schema={schema} model={model} onChangeModel={handleOnChange}>
        <AutoFields autoField={CustomAutoField} />
        <ErrorsField />
      </AutoForm>
    </ErrorBoundary>
  );
};
