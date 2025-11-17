import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';

import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { useInsertStep } from '../hooks/insert-step.hook';

interface ItemInsertStepProps extends PropsWithChildren<IDataTestID> {
  mode: AddStepMode.InsertChildStep | AddStepMode.InsertSpecialChildStep;
  vizNode: IVisualizationNode;
}

export const ItemInsertStep: FunctionComponent<ItemInsertStepProps> = (props) => {
  const { onInsertStep } = useInsertStep(props.vizNode, props.mode);

  return (
    <ContextMenuItem onClick={onInsertStep} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
