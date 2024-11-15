import { SyncAltIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { useReplaceStep } from '../hooks/replace-step.hook';

interface ItemReplaceStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  loadActionConfirmationModal: boolean;
}

export const ItemReplaceStep: FunctionComponent<ItemReplaceStepProps> = (props) => {
  const { onReplaceNode } = useReplaceStep(props.vizNode);

  return (
    <ContextMenuItem onClick={onReplaceNode} data-testid={props['data-testid']}>
      <SyncAltIcon /> Replace
    </ContextMenuItem>
  );
};
