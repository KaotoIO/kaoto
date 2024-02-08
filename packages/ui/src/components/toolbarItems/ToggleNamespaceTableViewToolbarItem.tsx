import { FunctionComponent, useCallback, useContext } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import { CodeIcon } from '@patternfly/react-icons';
import { DataMapperContext } from '../../providers';
import './toolbarItems.css';

export const ToggleNamespaceTableViewToolbarItem: FunctionComponent = () => {
  const { activeView, setActiveView } = useContext(DataMapperContext)!;
  const toggled = activeView === 'NamespaceTable';
  const onClick = useCallback(() => {
    setActiveView('SourceTarget');
  }, [setActiveView]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Show namespace table</div>}>
        <Button
          variant={'plain'}
          aria-label="Show/hide namespace table"
          onClick={onClick}
          className={css(toggled && 'toggled')}
          data-testid="show-hide-namespace-table-button"
        >
          <CodeIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};
