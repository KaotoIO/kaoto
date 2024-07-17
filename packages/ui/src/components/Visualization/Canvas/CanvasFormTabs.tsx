import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EntitiesContext } from '../../../providers/entities.provider';
import { SchemaBridgeProvider } from '../../../providers/schema-bridge.provider';
import { getUserUpdatedPropertiesSchema, isDefined, setValue } from '../../../utils';
import { CustomAutoForm, CustomAutoFormRef } from '../../Form/CustomAutoForm';
import { DataFormatEditor } from '../../Form/dataFormat/DataFormatEditor';
import { LoadBalancerEditor } from '../../Form/loadBalancer/LoadBalancerEditor';
import { StepExpressionEditor } from '../../Form/stepExpression/StepExpressionEditor';
import { UnknownNode } from '../Custom/UnknownNode';
import './CanvasFormTabs.scss';
import { CanvasNode } from './canvas.models';
import { FormTabsModes } from './canvasformtabs.modes';

interface CanvasFormTabsProps {
  selectedNode: CanvasNode;
}

export const CanvasFormTabs: FunctionComponent<CanvasFormTabsProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const divRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<CustomAutoFormRef>(null);
  const omitFields = useRef(props.selectedNode.data?.vizNode?.getBaseEntity()?.getOmitFormFields() || []);
  const [selectedTab, setSelectedTab] = useState<FormTabsModes>(FormTabsModes.ALL_FIELDS);

  const visualComponentSchema = useMemo(() => {
    const answer = props.selectedNode.data?.vizNode?.getComponentSchema();
    // Overriding parameters with an empty object When the parameters property is mistakenly set to null
    if (answer?.definition?.parameters === null) {
      answer!.definition.parameters = {};
    }
    return answer;
  }, [props.selectedNode.data?.vizNode, selectedTab]);
  const model = visualComponentSchema?.definition;
  let processedSchema = visualComponentSchema?.schema;
  if (selectedTab === FormTabsModes.USER_MODIFIED) {
    processedSchema = {
      ...visualComponentSchema?.schema,
      properties: getUserUpdatedPropertiesSchema(visualComponentSchema?.schema.properties ?? {}, model),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemClick = (event: any, _isSelected: boolean) => {
    const id = event.currentTarget.id;
    setSelectedTab(id);
  };

  useEffect(() => {
    formRef.current?.form.reset();
  }, [props.selectedNode.data?.vizNode, selectedTab]);

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

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      if (!props.selectedNode.data?.vizNode) {
        return;
      }

      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const newModel = props.selectedNode.data.vizNode.getComponentSchema()?.definition || {};
      setValue(newModel, path, updatedValue);
      props.selectedNode.data.vizNode.updateModel(newModel);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, props.selectedNode.data?.vizNode],
  );

  return (
    <>
      {stepFeatures.isUnknownComponent ? (
        <UnknownNode model={model} />
      ) : (
        <SchemaBridgeProvider schema={processedSchema} parentRef={divRef}>
          <ToggleGroup aria-label="Single selectable form tabs" className="form-tabs">
            {Object.values(FormTabsModes).map((mode) => (
              <ToggleGroupItem
                key={mode}
                text={mode}
                buttonId={mode}
                isSelected={selectedTab === mode}
                onChange={handleItemClick}
              />
            ))}
          </ToggleGroup>
          {stepFeatures.isExpressionAwareStep && (
            <StepExpressionEditor selectedNode={props.selectedNode} formMode={selectedTab} />
          )}
          {stepFeatures.isDataFormatAwareStep && (
            <DataFormatEditor selectedNode={props.selectedNode} formMode={selectedTab} />
          )}
          {stepFeatures.isLoadBalanceAwareStep && (
            <LoadBalancerEditor selectedNode={props.selectedNode} formMode={selectedTab} />
          )}
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
      )}
    </>
  );
};
