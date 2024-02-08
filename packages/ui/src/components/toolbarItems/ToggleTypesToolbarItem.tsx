import { FunctionComponent, useCallback, useContext } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { InfoIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { DataMapperContext } from '../../providers';
import './toolbarItems.css';

export const ToggleTypesToolbarItem: FunctionComponent = () => {
  const { showTypes, toggleShowTypes } = useContext(DataMapperContext)!;
  const onClick = useCallback(() => {
    toggleShowTypes();
  }, [toggleShowTypes]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Show/hide types</div>}>
        <Button
          variant={'plain'}
          aria-label="Show/hide types"
          onClick={onClick}
          className={css(showTypes && 'toggled')}
          data-testid="show-hide-types-button"
        >
          <InfoIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};
