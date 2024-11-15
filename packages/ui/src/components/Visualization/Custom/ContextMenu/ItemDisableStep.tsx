import { BanIcon, CheckIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { useDisableStep } from '../hooks/disable-step.hook';

interface ItemDisableStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const ItemDisableStep: FunctionComponent<ItemDisableStepProps> = (props) => {
  const { onToggleDisableNode, isDisabled } = useDisableStep(props.vizNode);

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
