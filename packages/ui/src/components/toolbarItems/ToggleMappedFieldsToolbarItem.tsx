import { FunctionComponent, useCallback, useContext } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { MapMarkedIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { DataMapperContext } from '../../providers';
import './toolbarItems.css';

export const ToggleMappedFieldsToolbarItem: FunctionComponent = () => {
  const { showMappedFields, toggleShowMappedFields } = useContext(DataMapperContext)!;
  const onClick = useCallback(() => {
    toggleShowMappedFields();
  }, [toggleShowMappedFields]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Show/hide mapped fields</div>}>
        <Button
          variant={'plain'}
          aria-label="Show/hide mapped fields"
          onClick={onClick}
          className={css(showMappedFields && 'toggled')}
          data-testid="show-hide-mapped-fields-button"
        >
          <MapMarkedIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};
