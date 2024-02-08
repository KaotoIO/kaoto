import { FunctionComponent, useCallback, useContext } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { MapIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { DataMapperContext } from '../../providers';
import './toolbarItems.css';

export const ToggleUnmappedFieldsToolbarItem: FunctionComponent = () => {
  const { showUnmappedFields, toggleShowUnmappedFields } = useContext(DataMapperContext)!;
  const onClick = useCallback(() => {
    toggleShowUnmappedFields();
  }, [toggleShowUnmappedFields]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Show/hide unmapped fields</div>}>
        <Button
          variant={'plain'}
          aria-label="Show/hide unmapped fields"
          onClick={onClick}
          className={css(showUnmappedFields && 'toggled')}
          data-testid="show-hide-unmapped-fields-button"
        >
          <MapIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};
