import { FunctionComponent } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { AboutDialog } from '../../_bk_atlasmap/UI';
import { useToggle } from '../../hooks';

export const AboutToolbarItem: FunctionComponent = () => {
  const { state, toggleOn, toggleOff } = useToggle(false);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>About AtlasMap</div>}>
        <Button variant={'plain'} aria-label="About Data Mapper" onClick={toggleOn} data-testid="about-button">
          <HelpIcon />
        </Button>
      </Tooltip>
      <AboutDialog title="Data Mapper" isOpen={state} onClose={toggleOff} />
    </ToolbarItem>
  );
};
