import { FunctionComponent, useCallback, useContext } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { TableIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { DataMapperContext } from '../../providers';
import './toolbarItems.css';

export const ToggleMappingTableViewToolbarItem: FunctionComponent = () => {
  const { activeView, setActiveView } = useContext(DataMapperContext)!;
  const toggled = activeView === 'MappingTable';
  const onClick = useCallback(() => {
    setActiveView('SourceTarget');
  }, [setActiveView]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Show mapping table</div>}>
        <Button
          variant={'plain'}
          aria-label="Show/hide mapping table"
          onClick={onClick}
          className={css(toggled && 'toggled')}
          data-testid="show-hide-mapping-table-button"
        >
          <TableIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};
