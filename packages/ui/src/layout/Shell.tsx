import './Shell.scss';

import { Page, PageSection, SkipToContent } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, PropsWithChildren, useCallback, useMemo } from 'react';

import { useLocalStorage } from '../hooks/local-storage.hook';
import { LocalStorageKeys } from '../models';
import { Navigation } from './Navigation';
import { TopBar } from './TopBar';

export const CANVAS_MAIN_ID = 'canvas-main';

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

  /**
   * Skip-link click handler: the browser's native anchor navigation scrolls to
   * the target but does NOT auto-focus non-native elements (divs with tabIndex).
   * We explicitly call .focus() so keyboard and AT users land on the canvas.
   */
  const handleSkipToCanvas = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(CANVAS_MAIN_ID);
    if (target) {
      target.focus();
    }
  }, []);

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
      skipToContent={
        /* WCAG 2.4.1 Bypass Blocks — lets keyboard/AT users jump past page chrome */
        <SkipToContent href={`#${CANVAS_MAIN_ID}`} onClick={handleSkipToCanvas}>
          Skip to canvas
        </SkipToContent>
      }
    >
      <PageSection isFilled hasBodyWrapper={false} className="shell__page-section">
        {props.children}
      </PageSection>
    </Page>
  );
};
