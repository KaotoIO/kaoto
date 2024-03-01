import { Card, CardBody, CardHeader } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { EntitiesContext } from '../../../providers/entities.provider';
import { SchemaBridgeProvider } from '../../../providers/schema-bridge.provider';
import { isDefined, setValue } from '../../../utils';
import { ErrorBoundary } from '../../ErrorBoundary';
import { SchemaService } from '../../Form';
import { CustomAutoForm, CustomAutoFormRef } from '../../Form/CustomAutoForm';
import { DataFormatEditor } from '../../Form/dataFormat/DataFormatEditor';
import { LoadBalancerEditor } from '../../Form/loadBalancer/LoadBalancerEditor';
import { StepExpressionEditor } from '../../Form/stepExpression/StepExpressionEditor';
import { UnknownNode } from '../Custom/UnknownNode';
import './CanvasForm.scss';
import { CanvasFormHeader } from './Form/CanvasFormHeader';
import { CanvasNode } from './canvas.models';

interface CanvasFormProps {
  selectedNode: CanvasNode;
  onClose?: () => void;
}

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const formRef = useRef<CustomAutoFormRef>(null);

  const visualComponentSchema = useMemo(() => {
    const answer = props.selectedNode.data?.vizNode?.getComponentSchema();
    // Overriding parameters with an empty object When the parameters property is mistakenly set to null
    if (answer?.definition?.parameters === null) {
      answer!.definition.parameters = {};
    }
    return answer;
  }, [props.selectedNode.data?.vizNode]);
  const model = visualComponentSchema?.definition;
  const title = visualComponentSchema?.title;

  useEffect(() => {
    formRef.current?.form.reset();
  }, [props.selectedNode.data?.vizNode]);

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      if (!props.selectedNode.data?.vizNode) {
        return;
      }

      const newModel = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition || {};
      setValue(newModel, path, value);
      props.selectedNode.data.vizNode.updateModel(newModel);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, props.selectedNode.data?.vizNode],
  );

  const stepFeatures = useMemo(() => {
    const comment = visualComponentSchema?.schema?.['$comment'] ?? '';
    const isExpressionAwareStep = comment.includes('expression');
    const isDataFormatAwareStep = comment.includes('dataformat');
    const isLoadBalanceAwareStep = comment.includes('loadbalance');
    const isUnknownComponent =
      !isDefined(visualComponentSchema) ||
      !isDefined(visualComponentSchema.schema) ||
      Object.keys(visualComponentSchema.schema).length === 0;
    return { isExpressionAwareStep, isDataFormatAwareStep, isLoadBalanceAwareStep, isUnknownComponent };
  }, [visualComponentSchema]);

  return (
    <ErrorBoundary key={props.selectedNode.id} fallback={<p>This node cannot be configured yet</p>}>
      <Card className="canvas-form">
        <CardHeader>
          <CanvasFormHeader
            nodeId={props.selectedNode.id}
            title={title}
            onClose={props.onClose}
            nodeIcon={props.selectedNode.data?.vizNode?.data?.icon}
          />
        </CardHeader>
        <CardBody className="canvas-form__body">
          {stepFeatures.isUnknownComponent ? (
            <UnknownNode model={model} />
          ) : (
            <>
              {stepFeatures.isExpressionAwareStep && <StepExpressionEditor selectedNode={props.selectedNode} />}
              {stepFeatures.isDataFormatAwareStep && <DataFormatEditor selectedNode={props.selectedNode} />}
              {stepFeatures.isLoadBalanceAwareStep && <LoadBalancerEditor selectedNode={props.selectedNode} />}
              <SchemaBridgeProvider schema={visualComponentSchema?.schema}>
                <CustomAutoForm
                  ref={formRef}
                  model={model}
                  onChange={handleOnChangeIndividualProp}
                  sortFields={false}
                  omitFields={SchemaService.OMIT_FORM_FIELDS}
                  data-testid="autoform"
                />
              </SchemaBridgeProvider>
            </>
          )}
        </CardBody>
      </Card>
    </ErrorBoundary>
  );
};
