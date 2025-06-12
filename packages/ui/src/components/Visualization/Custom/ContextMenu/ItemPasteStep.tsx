import { PasteIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { usePasteStep } from '../hooks/paste-step.hook';

interface ItemPasteStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  mode: AddStepMode;
  text: string;
}

export const ItemPasteStep: FunctionComponent<ItemPasteStepProps> = (props) => {
  const { onPasteStep, isCompatible } = usePasteStep(props.vizNode, props.mode);

  if (!isCompatible) return null;

  return (
    <ContextMenuItem onClick={onPasteStep} data-testid={props['data-testid']}>
      <PasteIcon /> {props.text}
    </ContextMenuItem>
  );
};
