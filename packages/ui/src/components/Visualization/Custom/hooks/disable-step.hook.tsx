import { setValue } from '@kaoto/forms';
import { useCallback, useContext, useMemo, useRef } from 'react';

import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useDisableStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const parsedDefinition = (vizNode.data.definition ?? vizNode.getNodeDefinition()) as
    | Record<string, unknown>
    | undefined;
  const isDisabled = !!parsedDefinition?.disabled;

  const parsedDefinitionRef = useRef(parsedDefinition);
  parsedDefinitionRef.current = parsedDefinition;

  const isDisabledRef = useRef(isDisabled);
  isDisabledRef.current = isDisabled;

  const onToggleDisableNode = useCallback(() => {
    const newModel = parsedDefinitionRef.current ?? vizNode.getNodeDefinition();
    setValue(newModel, 'disabled', !isDisabledRef.current);
    vizNode.updateModel(newModel);
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [entitiesContext, vizNode]);

  const value = useMemo(
    () => ({
      onToggleDisableNode,
      isDisabled,
    }),
    [isDisabled, onToggleDisableNode],
  );

  return value;
};
