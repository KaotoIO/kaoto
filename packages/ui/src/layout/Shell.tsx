import { Page, Panel, PanelMain, PanelMainBody } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useState } from 'react';
import { Navigation } from './Navigation';
import './Shell.scss';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const [isNavOpen, setIsNavOpen] = useState(true);

  const navToggle = useCallback(() => setIsNavOpen(!isNavOpen), [isNavOpen]);

  return (
    <Page header={<TopBar navToggle={navToggle} />} sidebar={<Navigation isNavOpen={isNavOpen} />}>
      <Panel className="shell__body" isScrollable>
        <PanelMain className="shell__body">
          <PanelMainBody className="shell__body">{props.children}</PanelMainBody>
        </PanelMain>
      </Panel>
    </Page>
  );
};
