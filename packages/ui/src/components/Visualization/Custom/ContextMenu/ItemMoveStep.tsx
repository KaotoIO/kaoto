import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { useMoveStep } from '../hooks/move-step.hook';

interface ItemMoveStepProps extends PropsWithChildren<IDataTestID> {
  mode: AddStepMode.AppendStep | AddStepMode.PrependStep;
  vizNode: IVisualizationNode;
}

export const ItemMoveStep: FunctionComponent<ItemMoveStepProps> = (props) => {
  const { canBeMoved, onMoveStep } = useMoveStep(props.vizNode, props.mode);

  if (!canBeMoved) return null;

  return (
    <ContextMenuItem onClick={onMoveStep} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
