import { AutoField, AutoFields, AutoForm, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { EntitiesContext } from '../../../providers/entities.provider';
import { ErrorBoundary } from '../../ErrorBoundary';
import { SchemaService } from '../../Form';
import { CustomAutoFieldDetector } from '../../Form/CustomAutoField';
import { DataFormatEditor } from './DataFormatEditor';
import { StepExpressionEditor } from './StepExpressionEditor';
import { CanvasNode } from './canvas.models';
import { LoadBalancerEditor } from './LoadBalancerEditor';
import './CanvasForm.scss';

interface CanvasFormProps {
  selectedNode: CanvasNode;
}

const omitFields = [
  'expression',
  'dataFormatType',
  'outputs',
  'steps',
  'when',
  'otherwise',
  'doCatch',
  'doFinally',
  'uri',
];

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const formRef = useRef<typeof AutoForm>();
  const schemaServiceRef = useRef(new SchemaService());

  const visualComponentSchema = useMemo(() => {
    const answer = props.selectedNode.data?.vizNode?.getComponentSchema();
    // Overriding parameters with an empty object When the parameters property is mistakenly set to null
    if (answer?.definition?.parameters === null) {
      answer!.definition.parameters = {};
    }
    return answer;
  }, [props.selectedNode.data?.vizNode]);
  const schema = useMemo(() => {
    return schemaServiceRef.current.getSchemaBridge(visualComponentSchema?.schema);
  }, [visualComponentSchema?.schema]);
  const model = visualComponentSchema?.definition;
  const componentName = visualComponentSchema?.title;

  useEffect(() => {
    formRef.current?.reset();
  }, [props.selectedNode.data?.vizNode]);

  const handleOnChange = useCallback(
    (newModel: Record<string, unknown>) => {
      props.selectedNode.data?.vizNode?.updateModel(newModel);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, props.selectedNode.data?.vizNode, props.selectedNode.id],
  );

  const isExpressionAwareStep = useMemo(() => {
    return schema?.schema && schema.schema['$comment']?.includes('expression');
  }, [schema]);

  const isDataFormatAwareStep = useMemo(() => {
    return schema?.schema && schema.schema['$comment']?.includes('dataformat');
  }, [schema]);

  const isLoadBalanceAwareStep = useMemo(() => {
    return schema?.schema && schema.schema['$comment']?.includes('loadbalance');
  }, [schema]);

  return schema?.schema === undefined ? null : (
    <ErrorBoundary key={props.selectedNode.id} fallback={<p>This node cannot be configured yet</p>}>
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <Title headingLevel="h1">{componentName}</Title>
        {isExpressionAwareStep && <StepExpressionEditor selectedNode={props.selectedNode} />}
        {isDataFormatAwareStep && <DataFormatEditor selectedNode={props.selectedNode} />}
        {isLoadBalanceAwareStep && <LoadBalancerEditor selectedNode={props.selectedNode} />}
        <AutoForm ref={formRef} schema={schema} model={model} onChangeModel={handleOnChange} data-testid="autoform">
          <AutoFields omitFields={omitFields} />
          <ErrorsField />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>
    </ErrorBoundary>
  );
};
