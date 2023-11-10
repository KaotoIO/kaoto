import { Page, Panel, PanelMain, PanelMainBody } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks';
import { LocalStorageKeys } from '../models';
import { SourceCodeContext } from '../providers/source-code.provider';
import { camelRouteYaml } from '../stubs/camel-route';
import { Navigation } from './Navigation';
import './Shell.scss';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const [isNavOpen, setIsNavOpen] = useState(true);
  const sourceCodeContext = useContext(SourceCodeContext)!;

  /** Load the source code from localStorage */
  const [localSourceCode, setLocalStorageSourceCode] = useLocalStorage(LocalStorageKeys.SourceCode, camelRouteYaml);

  const navToggle = useCallback(() => {
    setIsNavOpen(!isNavOpen);
  }, [isNavOpen]);

  useEffect(() => {
    /** Set the source code, entities, and visual entities from localStorage if available */
    if (localSourceCode) {
      sourceCodeContext.setCodeAndNotify(localSourceCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageSourceCode(sourceCodeContext.sourceCode);
  }, [setLocalStorageSourceCode, sourceCodeContext.sourceCode]);

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
