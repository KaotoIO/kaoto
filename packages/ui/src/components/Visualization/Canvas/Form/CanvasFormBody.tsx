import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { CanvasFormTabsContext } from '../../../../providers/canvas-form-tabs.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { getRequiredPropertiesSchema, getUserUpdatedProperties, isDefined, setValue } from '../../../../utils';
import { CustomAutoFormRef } from '../../../Form/CustomAutoForm';
import { UnknownNode } from '../../Custom/UnknownNode';
import { CanvasNode } from '../canvas.models';
import { KaotoForm } from '../FormV2/KaotoForm';

interface CanvasFormTabsProps {
  selectedNode: CanvasNode;
}

export const CanvasFormBody: FunctionComponent<CanvasFormTabsProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const { selectedTab } = useContext(CanvasFormTabsContext) ?? { selectedTab: 'Required' };
  const formRef = useRef<CustomAutoFormRef>(null);
  const omitFields = useRef(props.selectedNode.data?.vizNode?.getOmitFormFields() || []);

  const visualComponentSchema = useMemo(() => {
    const answer = props.selectedNode.data?.vizNode?.getComponentSchema();
    // Overriding parameters with an empty object When the parameters property is mistakenly set to null
    if (answer?.definition?.parameters === null) {
      answer!.definition.parameters = {};
    }
    return answer;
  }, [props.selectedNode.data?.vizNode]);
  const model = visualComponentSchema?.definition;
  let processedSchema = visualComponentSchema?.schema;
  if (selectedTab === 'Required') {
    processedSchema = getRequiredPropertiesSchema(visualComponentSchema?.schema, visualComponentSchema?.schema);
  } else if (selectedTab === 'Modified') {
    processedSchema = {
      ...visualComponentSchema?.schema,
      properties: getUserUpdatedProperties(
        visualComponentSchema?.schema.properties,
        model,
        visualComponentSchema?.schema,
      ),
    };
  }

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
        <KaotoForm
          schema={processedSchema}
          onChange={handleOnChangeIndividualProp}
          model={model}
          omitFields={omitFields.current}
        />
      )}
    </>
  );
};
