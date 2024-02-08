import { FunctionComponent, useCallback, useContext } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { ColumnsIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { DataMapperContext } from '../../providers';
import './toolbarItems.css';

export const ToggleSourceTargetViewToolbarItem: FunctionComponent = () => {
  const { activeView, setActiveView } = useContext(DataMapperContext)!;
  const toggled = activeView === 'SourceTarget';
  const onClick = useCallback(() => {
    setActiveView('SourceTarget');
  }, [setActiveView]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Show source target view</div>}>
        <Button
          variant={'plain'}
          aria-label="Show Source Target View"
          onClick={onClick}
          className={css(toggled && 'toggled')}
          data-testid="show-source-target-view-button"
        >
          <ColumnsIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};
