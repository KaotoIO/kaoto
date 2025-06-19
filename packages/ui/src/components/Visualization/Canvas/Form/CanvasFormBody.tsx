import { KaotoForm } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useMemo, useRef } from 'react';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { isDefined, setValue } from '../../../../utils';
import { UnknownNode } from '../../Custom/UnknownNode';
import { CanvasNode } from '../canvas.models';
import { customFieldsFactoryfactory } from './fields/custom-fields-factory';

interface CanvasFormTabsProps {
  selectedNode: CanvasNode;
}

export const CanvasFormBody: FunctionComponent<CanvasFormTabsProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
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

  const isUnknownComponent = useMemo(() => {
    return (
      !isDefined(visualComponentSchema) ||
      !isDefined(visualComponentSchema.schema) ||
      Object.keys(visualComponentSchema.schema).length === 0
    );
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

  if (isUnknownComponent) {
    return <UnknownNode model={model} />;
  }

  return (
    <KaotoForm
      schema={visualComponentSchema?.schema}
      onChangeProp={handleOnChangeIndividualProp}
      model={model}
      omitFields={omitFields.current}
      customFieldsFactory={customFieldsFactoryfactory}
    />
  );
};
