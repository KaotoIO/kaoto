import { Page, Panel, PanelMain, PanelMainBody } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useState } from 'react';
import { NavigationSidebar } from './Navigation';
import './Shell.scss';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const [isNavOpen, setIsNavOpen] = useState(true);

  const navToggle = useCallback(() => {
    setIsNavOpen(!isNavOpen);
  }, [isNavOpen]);

  return (
    <Page header={<TopBar navToggle={navToggle} />} sidebar={<NavigationSidebar isNavOpen={isNavOpen} />}>
      <Panel>
        <PanelMain>
          <PanelMainBody>{props.children}</PanelMainBody>
        </PanelMain>
      </Panel>
    </Page>
  );
};
