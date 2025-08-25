import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { useDuplicateStep } from '../hooks/duplicate-step.hook';

interface ItemDuplicateStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const ItemDuplicateStep: FunctionComponent<ItemDuplicateStepProps> = (props) => {
  const { canDuplicate, onDuplicate } = useDuplicateStep(props.vizNode);

  if (!canDuplicate) return null;

  return (
    <ContextMenuItem onClick={onDuplicate} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
