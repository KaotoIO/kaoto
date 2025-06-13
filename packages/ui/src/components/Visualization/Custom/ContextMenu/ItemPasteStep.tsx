import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { usePasteStep } from '../hooks/paste-step.hook';

interface ItemPasteStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  mode: AddStepMode.InsertChildStep | AddStepMode.InsertSpecialChildStep | AddStepMode.AppendStep;
}

export const ItemPasteStep: FunctionComponent<ItemPasteStepProps> = (props) => {
  const { onPasteStep } = usePasteStep(props.vizNode, props.mode);

  return (
    <ContextMenuItem onClick={onPasteStep} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
