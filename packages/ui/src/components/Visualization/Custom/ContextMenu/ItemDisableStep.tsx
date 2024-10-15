import { BanIcon, CheckIcon, PowerOffIcon } from '@patternfly/react-icons';
import { ContextMenuItem, useVisualizationController } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useMemo } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { setValue } from '../../../../utils/set-value';

interface ItemDisableStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findAllDisabledNodes(node: any): IVisualizationNode[] | null {
  const allDisabledNodes = [];
  if (node?.data?.vizNode?.getComponentSchema()?.definition?.disabled) {
    allDisabledNodes.push(node.data.vizNode);
  }
  if (node?.children) {
    for (const child of node.children) {
      const result = findAllDisabledNodes(child);
      allDisabledNodes.push(...(result || []));
    }
  }
  return allDisabledNodes;
}

export const ItemDisableStep: FunctionComponent<ItemDisableStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const controller = useVisualizationController();

  const isDisabled = !!props.vizNode.getComponentSchema()?.definition?.disabled;

  const allDisabledNodes = useMemo(() => {
    return findAllDisabledNodes(controller?.getGraph()) || [];
  }, [controller]);
  const isMultiDisabled = allDisabledNodes.length > 1;

  const onToggleDisableNode = useCallback(() => {
    const newModel = props.vizNode.getComponentSchema()?.definition || {};
    setValue(newModel, 'disabled', !isDisabled);
    props.vizNode.updateModel(newModel);

    entitiesContext?.updateEntitiesFromCamelResource();
  }, [entitiesContext, isDisabled, props.vizNode]);

  const onEnableAllNodes = useCallback(() => {
    allDisabledNodes.forEach((node) => {
      const newModel = node.getComponentSchema()?.definition || {};
      setValue(newModel, 'disabled', false);
      node.updateModel(newModel);
    });

    entitiesContext?.updateEntitiesFromCamelResource();
  }, [allDisabledNodes, entitiesContext]);

  return (
    <>
      <ContextMenuItem onClick={onToggleDisableNode} data-testid={props['data-testid']}>
        {isDisabled ? (
          <>
            <CheckIcon /> Enable
          </>
        ) : (
          <>
            <BanIcon /> Disable
          </>
        )}
      </ContextMenuItem>
      {isDisabled && isMultiDisabled && (
        <ContextMenuItem onClick={onEnableAllNodes}>
          <PowerOffIcon /> Enable All
        </ContextMenuItem>
      )}
    </>
  );
};
