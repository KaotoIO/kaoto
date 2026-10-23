import { Debug } from '@carbon/icons-react';
import { ToggleGroup, ToggleGroupItem, ToolbarItem } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';

export const ToggleDebugToolbarItem: FunctionComponent = () => {
  const { debug, setDebug } = useDataMapper();

  return (
    <ToolbarItem>
      <ToggleGroup>
        <ToggleGroupItem
          icon={<Debug />}
          aria-label="Enable debug mode"
          buttonId="enable-debug-mode"
          data-testid="enable-debug-mode-btn"
          isSelected={debug}
          onChange={() => {
            setDebug(!debug);
          }}
        />
      </ToggleGroup>
    </ToolbarItem>
  );
};
