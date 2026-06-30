import './Shell.scss';

import { Page, PageSection } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useMemo } from 'react';

import { useLocalStorage } from '../hooks/local-storage.hook';
import { LocalStorageKeys } from '../models';
import { Navigation } from './Navigation';
import { TopBar } from './TopBar';

const NOOP_PAGE_RESIZE = () => {};

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const defaultNavState = useMemo(() => {
    if (globalThis.innerWidth !== undefined) {
      return globalThis.innerWidth >= 1200;
    }
    // Server Side Rendering fallback can't be tested in JSDom
    return true;
  }, []);

  const [isNavOpen, setIsNavOpen] = useLocalStorage(LocalStorageKeys.NavigationExpanded, defaultNavState);

  const navToggle = useCallback(() => {
    setIsNavOpen(!isNavOpen);
  }, [isNavOpen, setIsNavOpen]);

  return (
    <Page
      isContentFilled
      // `onPageResize` makes PatternFly's Page install its ResizeObserver and track mobile view,
      // which is required for PageSidebar to receive `isMobile` and apply the `pf-m-expanded`
      // modifier. Without it the off-canvas sidebar can never slide into view on small screens.
      // relates: https://github.com/KaotoIO/kaoto/issues/3401
      onPageResize={NOOP_PAGE_RESIZE}
      masthead={<TopBar navToggle={navToggle} />}
      sidebar={<Navigation isNavOpen={isNavOpen} />}
    >
      <PageSection isFilled hasBodyWrapper={false} className="shell__page-section">
        {props.children}
      </PageSection>
    </Page>
  );
};
