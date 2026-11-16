import {
  Header,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderSideNavItems,
  SideNav,
  SideNavItems,
  SkipToContent,
} from '@carbon/react';
import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';

import logoKaoto from '../../assets/logo-kaoto-text.svg';
import { useIntegrationHeader } from '../../context/IntegrationHeaderContext';
import { routesInHeader, routesInSideNav } from '../../routes/config';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { NavHeaderItems } from './NavHeaderItems';
import { NavSideItems } from './NavSideItems';

const WORKSPACE_PATH = '/workspace';

export const Nav = () => {
  const location = useLocation();
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(false);
  const integrationHeader = useIntegrationHeader();

  const isIntegrationActive = !!integrationHeader?.current;

  const toggleNav = (): void => {
    setIsSideNavExpanded((isExpanded) => !isExpanded);
  };

  const closeNav = (): void => {
    setIsSideNavExpanded(false);
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

        {isIntegrationActive && (
          <div className="cs--nav__breadcrumb" data-testid="nav-breadcrumb">
            <Breadcrumbs items={integrationHeader.breadcrumbItems} current={integrationHeader.current} />
          </div>
        )}

        <HeaderGlobalBar />
      </Header>
      <SideNav aria-label="Side navigation" expanded={isSideNavExpanded} isPersistent={false}>
        <SideNavItems>
          <HeaderSideNavItems>
            <HeaderMenuItem
              as={RouterLink}
              to={WORKSPACE_PATH}
              isActive={location.pathname === WORKSPACE_PATH || location.pathname.startsWith(`${WORKSPACE_PATH}/`)}
              onClick={closeNav}
            >
              Workspace
            </HeaderMenuItem>
            <NavHeaderItems routesInHeader={routesInHeader} currentPath={location.pathname} onNavigate={closeNav} />
          </HeaderSideNavItems>

          <NavSideItems routesInSideNav={routesInSideNav} currentPath={location.pathname} />
        </SideNavItems>
      </SideNav>
    </>
  );
};
