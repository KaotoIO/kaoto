import './NoFieldFound.scss';

import { Callout } from '@carbon/react';
import { FunctionComponent, useContext } from 'react';

import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';

export const NoFieldFound: FunctionComponent<{ className?: string }> = (props) => {
  const { selectedTab, setSelectedTab, showSectionTabs } = useContext(CanvasFormTabsContext);
  const isAllTabSelected = selectedTab === 'All';
  /** Without the section tabs the user could not come back from the All tab, so do not offer the switch */
  const canSwitchToAllTab = !isAllTabSelected && showSectionTabs === true;
  const subtitle = canSwitchToAllTab
    ? 'No field found matching this criteria. Please switch to the All tab.'
    : 'No field found matching this criteria.';

  return (
    <Callout
      data-testid="no-field-found"
      className={['no-field-found', props.className].filter(Boolean).join(' ')}
      kind="info"
      lowContrast
      title={isAllTabSelected ? 'No fields found' : `No ${selectedTab} fields found`}
      subtitle={subtitle}
      actionButtonLabel={canSwitchToAllTab ? 'Switch to All tab' : ''}
      onActionButtonClick={
        canSwitchToAllTab
          ? () => {
              setSelectedTab('All');
            }
          : undefined
      }
    />
  );
};
