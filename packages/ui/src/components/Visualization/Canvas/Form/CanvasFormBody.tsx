import { FunctionComponent, useContext, useEffect, useRef } from 'react';
import { useVizNodeModel } from '../../../../hooks';
import { CanvasFormTabsContext } from '../../../../providers/canvas-form-tabs.provider';
import { SchemaBridgeProvider } from '../../../../providers/schema-bridge.provider';
import { getRequiredPropertiesSchema, getUserUpdatedPropertiesSchema, isDefined, setValue } from '../../../../utils';
import { CustomAutoForm, CustomAutoFormRef } from '../../../Form/CustomAutoForm';
import { DataFormatEditor } from '../../../Form/dataFormat/DataFormatEditor';
import { LoadBalancerEditor } from '../../../Form/loadBalancer/LoadBalancerEditor';
import { StepExpressionEditor } from '../../../Form/stepExpression/StepExpressionEditor';
import { UnknownNode } from '../../Custom/UnknownNode';
import { CanvasNode } from '../canvas.models';

interface CanvasFormTabsProps {
  selectedNode: CanvasNode;
}

export const CanvasFormBody: FunctionComponent<CanvasFormTabsProps> = (props) => {
  const vizNode = props.selectedNode.data?.vizNode;
  if (!vizNode) {
    throw new Error('CanvasFormBody must be used only on Node elements with an available IVisualizationNode');
  }

  const { selectedTab } = useContext(CanvasFormTabsContext) ?? { selectedTab: 'Required' };
  const divRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<CustomAutoFormRef>(null);
  const omitFields = useRef(vizNode.getOmitFormFields() || []);

  const { model, updateModel } = useVizNodeModel<Record<string, unknown>>(vizNode);
  // Overriding parameters with an empty object When the parameters property is mistakenly set to null
  if (model.parameters === null) {
    model.parameters = {};
  }

  const visualComponentSchema = vizNode.getComponentSchema();
  let processedSchema = visualComponentSchema?.schema;
  if (selectedTab === 'Required') {
    processedSchema = getRequiredPropertiesSchema(visualComponentSchema?.schema ?? {});
  } else if (selectedTab === 'Modified') {
    processedSchema = {
      ...visualComponentSchema?.schema,
      properties: getUserUpdatedPropertiesSchema(visualComponentSchema?.schema.properties ?? {}, model),
    };
  }

  const comment = visualComponentSchema?.schema?.['$comment'] ?? '';
  const isExpressionAwareStep = comment.includes('expression');
  const isDataFormatAwareStep = comment.includes('dataformat');
  const isLoadBalanceAwareStep = comment.includes('loadbalance');
  const isUnknownComponent =
    !isDefined(visualComponentSchema) ||
    !isDefined(visualComponentSchema.schema) ||
    Object.keys(visualComponentSchema.schema).length === 0;

  const handleOnChangeIndividualProp = (path: string, value: unknown) => {
    let updatedValue = value;
    if (typeof value === 'string' && value.trim() === '') {
      updatedValue = undefined;
    }

    setValue(model, path, updatedValue);
    updateModel(model);
  };

  useEffect(() => {
    formRef.current?.form.reset();
  }, [vizNode, selectedTab]);

  if (isUnknownComponent) {
    return <UnknownNode model={model} />;
  }

  return (
    <SchemaBridgeProvider schema={processedSchema} parentRef={divRef}>
      {isExpressionAwareStep && <StepExpressionEditor selectedNode={props.selectedNode} formMode={selectedTab} />}
      {isDataFormatAwareStep && <DataFormatEditor selectedNode={props.selectedNode} formMode={selectedTab} />}
      {isLoadBalanceAwareStep && <LoadBalancerEditor selectedNode={props.selectedNode} formMode={selectedTab} />}
      <CustomAutoForm
        key={props.selectedNode.id}
        ref={formRef}
        model={model}
        onChange={handleOnChangeIndividualProp}
        sortFields={false}
        omitFields={omitFields.current}
        data-testid="autoform"
      />
      <div data-testid="root-form-placeholder" ref={divRef} />
    </SchemaBridgeProvider>
  );
};
