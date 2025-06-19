import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { useCopyStep } from '../hooks/copy-step.hook';

interface ItemCopyStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const ItemCopyStep: FunctionComponent<ItemCopyStepProps> = (props) => {
  const { onCopyStep } = useCopyStep(props.vizNode);

  return (
    <ContextMenuItem onClick={onCopyStep} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
