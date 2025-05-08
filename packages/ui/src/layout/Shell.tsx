import { Page, PageSection } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { useLocalStorage } from '../hooks/local-storage.hook';
import { LocalStorageKeys } from '../models';
import { Navigation } from './Navigation';
import './Shell.scss';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  const [isNavOpen, setIsNavOpen] = useLocalStorage(LocalStorageKeys.NavigationExpanded, true);

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
