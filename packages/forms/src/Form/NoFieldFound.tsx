import './NoFieldFound.scss';

import { Callout } from '@carbon/react';
import { FunctionComponent, useContext } from 'react';

import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';

export const NoFieldFound: FunctionComponent<{ className?: string }> = (props) => {
  const canvasFormTabsContext = useContext(CanvasFormTabsContext);
  const isAllTabSelected = canvasFormTabsContext.selectedTab === 'All';

  return (
    <Callout
      data-testid="no-field-found"
      className={['no-field-found', props.className].filter(Boolean).join(' ')}
      kind="info"
      lowContrast
      title={isAllTabSelected ? 'No fields found' : `No ${canvasFormTabsContext.selectedTab} fields found`}
      subtitle={
        isAllTabSelected
          ? 'No field found matching this criteria.'
          : 'No field found matching this criteria. Please switch to the All tab.'
      }
      actionButtonLabel={!isAllTabSelected ? 'Switch to All tab' : ''}
      onActionButtonClick={
        !isAllTabSelected
          ? () => {
              canvasFormTabsContext.setSelectedTab('All');
            }
          : undefined
      }
    />
  );
};
