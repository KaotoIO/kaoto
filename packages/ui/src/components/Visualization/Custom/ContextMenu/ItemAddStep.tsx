import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { useAddStep } from '../hooks/add-step.hook';

interface ItemAddStepProps extends PropsWithChildren<IDataTestID> {
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep;
  vizNode: IVisualizationNode;
}

export const ItemAddStep: FunctionComponent<ItemAddStepProps> = (props) => {
  const { onAddStep } = useAddStep(props.vizNode, props.mode);

  return (
    <ContextMenuItem onClick={onAddStep} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
