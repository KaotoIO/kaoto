import { Card, CardBody, CardHeader, SearchInput, Tabs, Tab, TabTitleText, Tooltip } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { VisibleFlowsContext, FilteredFieldContext } from '../../../providers';
import { EntitiesContext } from '../../../providers/entities.provider';
import { SchemaBridgeProvider } from '../../../providers/schema-bridge.provider';
import { isDefined, setValue, getUserUpdatedPropertiesSchema } from '../../../utils';
import { ErrorBoundary } from '../../ErrorBoundary';
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
  const { visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const entitiesContext = useContext(EntitiesContext);
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);
  const defaultformRef = useRef<CustomAutoFormRef>(null);
  const specialformRef = useRef<CustomAutoFormRef>(null);
  const defaultformdivRef = useRef<HTMLDivElement>(null);
  const specialformdivRef = useRef<HTMLDivElement>(null);
  const flowIdRef = useRef<string | undefined>(undefined);
  const omitFields = useRef(props.selectedNode.data?.vizNode?.getBaseEntity()?.getOmitFormFields() || []);
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const defaultTooltipRef = useRef<HTMLElement>(null);
  const specialTooltipRef = useRef<HTMLElement>(null);

  const handleTabClick = (_event: React.MouseEvent | React.KeyboardEvent | MouseEvent, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };

  const visualComponentSchema = useMemo(() => {
    const answer = props.selectedNode.data?.vizNode?.getComponentSchema();
    // Overriding parameters with an empty object When the parameters property is mistakenly set to null
    if (answer?.definition?.parameters === null) {
      answer!.definition.parameters = {};
    }
    return answer;
  }, [props.selectedNode.data?.vizNode, activeTabKey]);
  const model = visualComponentSchema?.definition;
  const title = visualComponentSchema?.title;

  const processedSchema = useMemo(() => {
    return {
      ...visualComponentSchema?.schema,
      properties: getUserUpdatedPropertiesSchema(visualComponentSchema?.schema.properties ?? {}, model),
    };
  }, [visualComponentSchema]);

  /** Store the flow's initial Id */
  useEffect(() => {
    flowIdRef.current = props.selectedNode.data?.vizNode?.getBaseEntity()?.getId();
  }, []);

  useEffect(() => {
    defaultformRef.current?.form.reset();
    specialformRef.current?.form.reset();
  }, [props.selectedNode.data?.vizNode, activeTabKey]);

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

  const onClose = useCallback(() => {
    props.onClose?.();
    const newId = props.selectedNode.data?.vizNode?.getBaseEntity()?.getId();
    if (typeof flowIdRef.current === 'string' && typeof newId === 'string' && flowIdRef.current !== newId) {
      visualFlowsApi.renameFlow(flowIdRef.current, newId);
    }
  }, [props, visualFlowsApi]);

  return (
    <ErrorBoundary key={props.selectedNode.id} fallback={<p>This node cannot be configured yet</p>}>
      <Card className="canvas-form">
        <CardHeader>
          <SearchInput
            className="filter-fields"
            placeholder="Find properties by name"
            data-testid="filter-fields"
            value={filteredFieldText}
            onChange={onFilterChange}
            onClear={onFilterChange}
          />
          <CanvasFormHeader
            nodeId={props.selectedNode.id}
            title={title}
            onClose={onClose}
            nodeIcon={props.selectedNode.data?.vizNode?.data?.icon}
          />
        </CardHeader>

        <CardBody className="canvas-form__body">
          <Tabs
            activeKey={activeTabKey}
            onSelect={handleTabClick}
            aria-label="Tabs in the canvas side-bar"
            role="form-tabs"
            className="form-tabs"
          >
            <Tab eventKey={0} title={<TabTitleText>Default Form</TabTitleText>} ref={defaultTooltipRef}>
              {stepFeatures.isUnknownComponent ? (
                <UnknownNode model={model} />
              ) : (
                <SchemaBridgeProvider schema={visualComponentSchema?.schema} parentRef={defaultformdivRef}>
                  {stepFeatures.isExpressionAwareStep && <StepExpressionEditor selectedNode={props.selectedNode} />}
                  {stepFeatures.isDataFormatAwareStep && <DataFormatEditor selectedNode={props.selectedNode} />}
                  {stepFeatures.isLoadBalanceAwareStep && <LoadBalancerEditor selectedNode={props.selectedNode} />}
                  <CustomAutoForm
                    key={props.selectedNode.id}
                    ref={defaultformRef}
                    model={model}
                    onChange={handleOnChangeIndividualProp}
                    sortFields={false}
                    omitFields={omitFields.current}
                    data-testid="autoform"
                  />
                  <div data-testid="root-form-placeholder" ref={defaultformdivRef} />
                </SchemaBridgeProvider>
              )}
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Special Form</TabTitleText>} ref={specialTooltipRef}>
              <SchemaBridgeProvider schema={processedSchema} parentRef={specialformdivRef}>
                {stepFeatures.isExpressionAwareStep && <StepExpressionEditor selectedNode={props.selectedNode} />}
                {stepFeatures.isDataFormatAwareStep && <DataFormatEditor selectedNode={props.selectedNode} />}
                {stepFeatures.isLoadBalanceAwareStep && <LoadBalancerEditor selectedNode={props.selectedNode} />}
                <CustomAutoForm
                  key={props.selectedNode.id}
                  ref={specialformRef}
                  model={model}
                  onChange={handleOnChangeIndividualProp}
                  sortFields={false}
                  omitFields={omitFields.current}
                  data-testid="autoform"
                />
                <div data-testid="root-form-placeholder" ref={specialformdivRef} />
              </SchemaBridgeProvider>
            </Tab>
          </Tabs>
          <Tooltip id="tooltip-ref1" content="Form that shows all fields." triggerRef={defaultTooltipRef} />
          <Tooltip
            id="tooltip-ref2"
            content="Form that shows only user modified fields."
            triggerRef={specialTooltipRef}
          />
        </CardBody>
      </Card>
    </ErrorBoundary>
  );
};
