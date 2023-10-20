import { Nav, NavExpandable, NavItem, NavList, PageSidebar, PageSidebarBody } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Links } from '../router/links.models';
import { NavElements } from './navigation.models';

interface INavigationSidebar {
  isNavOpen: boolean;
}

export const Navigation: FunctionComponent<INavigationSidebar> = (props) => {
  const currentLocation = useLocation();

  return (
    <PageSidebar isSidebarOpen={props.isNavOpen} id="vertical-sidebar">
      <PageSidebarBody>
        <Nav aria-label="Default global nav">
          <NavList>
            {navElements.map((nav, index) => {
              if ('children' in nav) {
                return (
                  <NavExpandable
                    id={nav.title}
                    key={nav.title}
                    title={nav.title}
                    groupId={nav.title}
                    isActive={nav.children.some((child) => child.to === currentLocation.pathname)}
                    isExpanded
                  >
                    {nav.children.map((child) => (
                      <NavItem
                        id={child.title}
                        key={child.title}
                        itemId={index}
                        isActive={currentLocation.pathname === child.to}
                      >
                        <Link data-testid={child.title} to={child.to}>
                          {child.title}
                        </Link>
                      </NavItem>
                    ))}
                  </NavExpandable>
                );
              }

              return (
                <NavItem id={nav.title} key={nav.title} itemId={index} isActive={currentLocation.pathname === nav.to}>
                  <Link data-testid={nav.title} to={nav.to}>
                    {nav.title}
                  </Link>
                </NavItem>
              );
            })}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );
};

const navElements: NavElements = [
  {
    title: 'Visualization',
    children: [
      { title: 'Design', to: Links.Home },
      { title: 'Source Code', to: Links.SourceCode },
    ],
  },
  { title: 'Beans', to: Links.Beans },
  { title: 'Rest', to: Links.Rest },
  { title: 'Metadata', to: Links.Metadata },
  { title: 'Pipe ErrorHandler', to: Links.PipeErrorHandler },
  { title: 'Catalog', to: Links.Catalog },
];
