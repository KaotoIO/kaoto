import { Page, Panel, PanelMain, PanelMainBody } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks';
import { LocalStorageKeys } from '../models';
import { EntitiesContext } from '../providers/entities.provider';
import { camelRouteYaml } from '../stubs/camel-route';
import { Navigation } from './Navigation';
import './Shell.scss';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const [isNavOpen, setIsNavOpen] = useState(true);
  const entitiesContext = useContext(EntitiesContext);

  /** Load the source code from localStorage */
  const [localSourceCode] = useLocalStorage(LocalStorageKeys.SourceCode, camelRouteYaml);

  const navToggle = useCallback(() => {
    setIsNavOpen(!isNavOpen);
  }, [isNavOpen]);

  useEffect(() => {
    /** Set the source code, entities, and visual entities from localStorage if available */
    if (localSourceCode) {
      entitiesContext?.setCode(localSourceCode);
    }
  }, []);

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
