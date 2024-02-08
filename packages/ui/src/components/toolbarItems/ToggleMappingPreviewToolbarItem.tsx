import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext } from 'react';
import { EyeIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { DataMapperContext } from '../../providers';
import './toolbarItems.css';

export const ToggleMappingPreviewToolbarItem: FunctionComponent = () => {
  const { isPreviewEnabled, togglePreview } = useContext(DataMapperContext)!;
  const onClick = useCallback(() => {
    togglePreview();
  }, [togglePreview]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Show preview</div>}>
        <Button
          variant={'plain'}
          aria-label="Show/hide preview"
          onClick={onClick}
          className={css(isPreviewEnabled && 'toggled')}
          data-testid="show-hide-preview-button"
        >
          <EyeIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};
