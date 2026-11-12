import { isDefined, KaotoForm } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { IVisualizationNode } from '../../../../models';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { setValue } from '../../../../utils';
import { Anchors } from '../../../registers/anchors';
import { IInteractionType, IOnUpdateAddon } from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { RenderingAnchor } from '../../../RenderingAnchor/RenderingAnchor';
import { UnknownNode } from '../../Custom/UnknownNode';
import { customFieldsFactoryfactory } from './fields/custom-fields-factory';
import { SuggestionRegistrar } from './suggestions/SuggestionsProvider';

interface CanvasFormTabsProps {
  vizNode: IVisualizationNode;
  onDismiss?: () => void;
}

export const CanvasFormBody: FunctionComponent<CanvasFormTabsProps> = ({ vizNode, onDismiss }) => {
  const entitiesContext = useContext(EntitiesContext);
  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);
  const [omitFields] = useState(() => vizNode.getOmitFormFields() ?? []);
  const schema = vizNode.data.schema;

  const isUnknownComponent = useMemo(() => {
    return !isDefined(schema) || Object.keys(schema).length === 0;
  }, [schema]);

  const model = vizNode.data.definition as Record<string, unknown> | undefined;

  // Keep a ref to the current model so that handleOnChangeIndividualProp always writes
  // back to the same object that the form is rendering.
  const modelRef = useRef(model);
  useLayoutEffect(() => {
    modelRef.current = model;
  }, [model]);

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const newModel = modelRef.current ?? {};
      setValue(newModel, path, updatedValue);
      vizNode.updateModel(newModel);

      const onUpdateAddons = getRegisteredInteractionAddons(IInteractionType.ON_UPDATE, vizNode) as IOnUpdateAddon[];
      onUpdateAddons.forEach((addon) => {
        addon.callback({ vizNode });
      });

      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, getRegisteredInteractionAddons, vizNode],
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
        omitFields={omitFields}
        customFieldsFactory={customFieldsFactoryfactory}
        showFilterField
        showSectionTabs
        defaultSectionTab="Required"
        onDismiss={onDismiss}
      >
        <RenderingAnchor anchorTag={Anchors.CanvasFormHeader} vizNode={vizNode} />
      </KaotoForm>
    </SuggestionRegistrar>
  );
};
