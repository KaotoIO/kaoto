import { BanIcon, CheckIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../models';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../providers/entities.provider';
import { setValue } from '../../../utils/set-value';

interface ItemDisableStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const ItemDisableStep: FunctionComponent<ItemDisableStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);

  const isDisabled = !!props.vizNode.getComponentSchema()?.definition?.disabled;

  const onToggleDisableNode = useCallback(() => {
    const newModel = props.vizNode.getComponentSchema()?.definition || {};
    setValue(newModel, 'disabled', !isDisabled);
    props.vizNode.updateModel(newModel);

    entitiesContext?.updateEntitiesFromCamelResource();
  }, [entitiesContext, isDisabled, props.vizNode]);

  return (
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
  );
};
