import './Shell.scss';

import { Page, PageSection } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useMemo } from 'react';

import { useLocalStorage } from '../hooks/local-storage.hook';
import { LocalStorageKeys } from '../models';
import { Navigation } from './Navigation';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const defaultNavState = useMemo(() => {
    if (globalThis.window !== undefined) {
      return globalThis.window.innerWidth >= 1200;
    }
    // Server Side Rendering fallback can't be tested in JSDom
    return true;
  }, []);

  const [isNavOpen, setIsNavOpen] = useLocalStorage(LocalStorageKeys.NavigationExpanded, defaultNavState);

  const navToggle = useCallback(() => {
    setIsNavOpen(!isNavOpen);
  }, [isNavOpen, setIsNavOpen]);

  return (
    <Page isContentFilled masthead={<TopBar navToggle={navToggle} />} sidebar={<Navigation isNavOpen={isNavOpen} />}>
      <PageSection isFilled hasBodyWrapper={false} className="shell__page-section">
        {props.children}
      </PageSection>
    </Page>
  );
};
