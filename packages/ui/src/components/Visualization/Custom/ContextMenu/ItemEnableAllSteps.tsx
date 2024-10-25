import { PowerOffIcon } from '@patternfly/react-icons';
import { ContextMenuItem, useVisualizationController } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useMemo } from 'react';
import { IDataTestID } from '../../../../models';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { getVisualizationNodesFromGraph, setValue } from '../../../../utils';

export const ItemEnableAllSteps: FunctionComponent<PropsWithChildren<IDataTestID>> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const controller = useVisualizationController();
  const disabledNodes = useMemo(() => {
    return getVisualizationNodesFromGraph(controller.getGraph(), (node) => {
      return node.getComponentSchema()?.definition?.disabled;
    });
  }, [controller]);
  const isMultiDisabled = disabledNodes.length > 1;

  const onClick = useCallback(() => {
    disabledNodes.forEach((node) => {
      const newModel = node.getComponentSchema()?.definition || {};
      setValue(newModel, 'disabled', false);
      node.updateModel(newModel);
    });

    entitiesContext?.updateEntitiesFromCamelResource();
  }, [disabledNodes, entitiesContext]);

  if (!isMultiDisabled) {
    return null;
  }

  return (
    <ContextMenuItem onClick={onClick} data-testid={props['data-testid']}>
      <PowerOffIcon /> Enable All
    </ContextMenuItem>
  );
};
