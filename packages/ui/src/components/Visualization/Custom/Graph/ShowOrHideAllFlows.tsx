import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { VisibleFlowsContext } from '../../../../providers';

interface ItemAddStepProps extends PropsWithChildren<IDataTestID> {
  mode: 'showAll' | 'hideAll' | 'addEntity';
}
export const ShowOrHideAllFlows: FunctionComponent<ItemAddStepProps> = (props) => {
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  return (
    <ContextMenuItem
      onClick={() => {
        if (props.mode === 'showAll') {
          visibleFlowsContext.visualFlowsApi?.showFlows();
        } else if (props.mode === 'hideAll') {
          visibleFlowsContext.visualFlowsApi?.hideFlows();
        }
      }}
      data-testid={props['data-testid']}
    >
      {props.children}
    </ContextMenuItem>
  );
};
