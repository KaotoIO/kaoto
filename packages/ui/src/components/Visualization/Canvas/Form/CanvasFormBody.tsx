import { isDefined, KaotoForm } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useMemo, useRef } from 'react';

import { IVisualizationNode } from '../../../../models';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { setValue } from '../../../../utils';
import { UnknownNode } from '../../Custom/UnknownNode';
import { customFieldsFactoryfactory } from './fields/custom-fields-factory';
import { SuggestionRegistrar } from './suggestions/SuggestionsProvider';

interface CanvasFormTabsProps {
  vizNode: IVisualizationNode;
}

export const CanvasFormBody: FunctionComponent<CanvasFormTabsProps> = ({ vizNode }) => {
  const entitiesContext = useContext(EntitiesContext);
  const omitFields = useRef(vizNode.getOmitFormFields() ?? []);
  const schema = vizNode.data.schema;

  const isUnknownComponent = useMemo(() => {
    return !isDefined(schema) || Object.keys(schema).length === 0;
  }, [schema]);

  const model = (vizNode.data.definition ?? vizNode.getNodeDefinition()) as Record<string, unknown> | undefined;

  // Keep a ref to the current model so that handleOnChangeIndividualProp always writes
  // back to the same object that the form is rendering.
  const modelRef = useRef(model);
  modelRef.current = model;

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const newModel = modelRef.current ?? vizNode.getNodeDefinition() ?? {};
      setValue(newModel, path, updatedValue);
      vizNode.updateModel(newModel);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, vizNode],
  );

  if (isUnknownComponent) {
    return <UnknownNode model={model} />;
  }

  if (!model) {
    return null;
  }

  return (
    <SuggestionRegistrar>
      <KaotoForm
        schema={schema}
        onChangeProp={handleOnChangeIndividualProp}
        model={model}
        omitFields={omitFields.current}
        customFieldsFactory={customFieldsFactoryfactory}
      />
    </SuggestionRegistrar>
  );
};
