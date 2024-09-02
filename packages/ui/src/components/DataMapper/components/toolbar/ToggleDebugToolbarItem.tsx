import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks';
import { ToggleGroup, ToggleGroupItem, ToolbarItem } from '@patternfly/react-core';
import { BugIcon } from '@patternfly/react-icons';

export const ToggleDebugToolbarItem: FunctionComponent = () => {
  const { debug, setDebug } = useDataMapper();

  return (
    <ToolbarItem>
      <ToggleGroup>
        <ToggleGroupItem
          icon={<BugIcon />}
          aria-label="Enable debug mode"
          buttonId="enable-debug-mode"
          data-testid="enable-debug-mode-btn"
          isSelected={debug}
          onChange={() => setDebug(!debug)}
        ></ToggleGroupItem>
      </ToggleGroup>
    </ToolbarItem>
  );
};
