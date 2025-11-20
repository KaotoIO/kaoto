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
  const schema = useMemo(() => vizNode.getNodeSchema(), [vizNode]);

  const isUnknownComponent = useMemo(() => {
    return !isDefined(schema) || Object.keys(schema).length === 0;
  }, [schema]);

  const model = vizNode.getNodeDefinition();

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const newModel = vizNode.getNodeDefinition() ?? {};
      setValue(newModel, path, updatedValue);
      vizNode.updateModel(newModel);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, vizNode],
  );

  if (isUnknownComponent) {
    return <UnknownNode model={model} />;
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
