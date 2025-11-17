import { PowerOffIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren } from 'react';

import { IDataTestID } from '../../../../models';
import { useEnableAllSteps } from '../hooks/enable-all-steps.hook';

export const ItemEnableAllSteps: FunctionComponent<PropsWithChildren<IDataTestID>> = (props) => {
  const { areMultipleStepsDisabled, onEnableAllSteps } = useEnableAllSteps();
  if (!areMultipleStepsDisabled) {
    return null;
  }

  return (
    <ContextMenuItem onClick={onEnableAllSteps} data-testid={props['data-testid']}>
      <PowerOffIcon /> Enable All
    </ContextMenuItem>
  );
};
