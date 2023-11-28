import { Page, Panel, PanelMain, PanelMainBody } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { LocalStorageKeys } from '../models';
import { SourceCodeApiContext } from '../providers/source-code.provider';
import { camelRouteYaml } from '../stubs/camel-route';
import { EventNotifier } from '../utils/event-notifier';
import { Navigation } from './Navigation';
import './Shell.scss';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const eventNotifier = EventNotifier.getInstance();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const sourceCodeApiContext = useContext(SourceCodeApiContext)!;

  const navToggle = useCallback(() => {
    setIsNavOpen(!isNavOpen);
  }, [isNavOpen]);

  /**
   * Set the source code, entities, and visual entities from localStorage if available
   * We don't use the useLocalStorage hook because we don't want to re-render the app
   * as we just want to set the initial values
   */
  useEffect(() => {
    const localSourceCode = localStorage.getItem(LocalStorageKeys.SourceCode) ?? camelRouteYaml;
    sourceCodeApiContext.setCodeAndNotify(localSourceCode);
  }, [sourceCodeApiContext]);

  /**
   * Save the source code into the localStorage
   * We don't use the useLocalStorage hook because we don't want to re-render the app
   * as we just want to store the value
   */
  useEffect(() => {
    const unSubscribeFromEntities = eventNotifier.subscribe('entities:updated', (code) => {
      localStorage.setItem(LocalStorageKeys.SourceCode, code);
    });
    const unSubscribeFromCode = eventNotifier.subscribe('code:updated', (code) => {
      localStorage.setItem(LocalStorageKeys.SourceCode, code);
    });

    return () => {
      unSubscribeFromEntities();
      unSubscribeFromCode();
    };
  }, [eventNotifier]);

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
