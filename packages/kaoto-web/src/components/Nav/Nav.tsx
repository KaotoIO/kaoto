import {
  Header,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderNavigation,
  HeaderSideNavItems,
  SideNav,
  SideNavItems,
  SkipToContent,
} from '@carbon/react';
import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';

import logoKaoto from '../../assets/logo-kaoto-text.svg';
import { routesInHeader, routesInSideNav } from '../../routes/config';
import { NavHeaderItems } from './NavHeaderItems';
import { NavSideItems } from './NavSideItems';

export const Nav = () => {
  const location = useLocation();
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);

  const toggleNav = (): void => {
    // Reason for this implementation of state change through an updater function:
    // https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state
    setIsSideNavExpanded((isExpanded) => !isExpanded);
  };

  return (
    <>
      <Header>
        <SkipToContent />
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
          onClick={toggleNav}
          isCollapsible
          isActive={isSideNavExpanded}
          aria-expanded={isSideNavExpanded}
        />
        <RouterLink to="/" className="cds--header__name">
          <img src={logoKaoto} alt="Kaoto" className="cs--nav__logo" />
        </RouterLink>
        {routesInHeader.length > 0 && (
          <HeaderNavigation>
            <NavHeaderItems routesInHeader={routesInHeader} currentPath={location.pathname} />
          </HeaderNavigation>
        )}
        <HeaderGlobalBar />
      </Header>
      <SideNav aria-label="Side navigation" expanded={isSideNavExpanded} isPersistent={false}>
        <SideNavItems>
          {routesInHeader.length > 0 && (
            <HeaderSideNavItems hasDivider>
              <NavHeaderItems routesInHeader={routesInHeader} currentPath={location.pathname} />
            </HeaderSideNavItems>
          )}

          <NavSideItems routesInSideNav={routesInSideNav} currentPath={location.pathname} />
        </SideNavItems>
      </SideNav>
    </>
  );
};
