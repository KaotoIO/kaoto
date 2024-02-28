import { Card, CardBody, CardHeader } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { EntitiesContext } from '../../../providers/entities.provider';
import { setValue } from '../../../utils';
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
    const isExpressionAwareStep = schema?.schema && schema.schema['$comment']?.includes('expression');
    const isDataFormatAwareStep = schema?.schema && schema.schema['$comment']?.includes('dataformat');
    const isLoadBalanceAwareStep = schema?.schema && schema.schema['$comment']?.includes('loadbalance');
    const isUnknownComponent = schema?.schema === undefined || Object.keys(schema?.schema).length === 0;
    return { isExpressionAwareStep, isDataFormatAwareStep, isLoadBalanceAwareStep, isUnknownComponent };
  }, [schema]);

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
              <CustomAutoForm
                ref={formRef}
                schemaBridge={schema}
                model={model}
                onChange={handleOnChangeIndividualProp}
                sortFields={false}
                omitFields={SchemaService.OMIT_FORM_FIELDS}
                data-testid="autoform"
              />
            </>
          )}
        </CardBody>
      </Card>
    </ErrorBoundary>
  );
};
