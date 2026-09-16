import { InlineNotification, Link, Tile } from '@carbon/react';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';

export const NoFieldFound: FunctionComponent<{ className?: string }> = (props) => {
  const canvasFormTabsContext = useContext(CanvasFormTabsContext);
  const isAllTabSelected = canvasFormTabsContext.selectedTab === 'All';

  return (
    <Tile data-testid="no-field-found" className={props.className}>
      <InlineNotification
        kind="info"
        title={isAllTabSelected ? 'No fields found' : `No ${canvasFormTabsContext.selectedTab} fields found`}
        subtitle={
          isAllTabSelected
            ? 'No field found matching this criteria.'
            : 'No field found matching this criteria. Please switch to the All tab.'
        }
        hideCloseButton
      >
        {!isAllTabSelected && (
          <Link
            onClick={() => {
              canvasFormTabsContext.setSelectedTab('All');
            }}
            inline
          >
            Switch to All tab
          </Link>
        )}
      </InlineNotification>
    </Tile>
  );
};
