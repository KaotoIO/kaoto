import { isDefined, KaotoForm } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useMemo, useRef } from 'react';

import { useParsedDefinition } from '../../../../hooks/useParsedDefinition';
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

  const parsedDefinition = useParsedDefinition(vizNode);

  // Entities that don't implement getParsedDefinition (e.g. Pipe, Test, ErrorHandler,
  // RestConfiguration) must use the synchronous getNodeDefinition() instead.
  // Walk to the root node to find the entity, since data.entity is only set on the root node.
  const rootEntity = useMemo(() => {
    let node: IVisualizationNode = vizNode;
    while (node.getPreviousNode() ?? node.getParentNode()) {
      node = (node.getPreviousNode() ?? node.getParentNode())!;
    }
    return node.data.entity;
  }, [vizNode]);
  const supportsParsedDefinition =
    typeof (rootEntity as { getParsedDefinition?: unknown })?.getParsedDefinition === 'function';
  const model = supportsParsedDefinition ? parsedDefinition : vizNode.getNodeDefinition();

  // Keep a ref to the current model so that handleOnChangeIndividualProp always writes
  // back to the same (potentially parsed/expanded) object that the form is rendering,
  // even when the parsedDefinition promise resolved without triggering a re-render
  // (e.g. when the resolved value is falsy-equivalent to the initial undefined state).
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
