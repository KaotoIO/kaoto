import { Nav, NavExpandable, NavItem, NavList, PageSidebar, PageSidebarBody } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent, useContext, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Links } from '../router/links.models';
import { NavElements } from './navigation.models';
import { EntitiesContext } from '../providers';
import { SourceSchemaType } from '../models/camel';
interface INavigationSidebar {
  isNavOpen: boolean;
}

export const Navigation: FunctionComponent<INavigationSidebar> = (props) => {
  const currentLocation = useLocation();
  const { currentSchemaType } = useContext(EntitiesContext)!;

  const navElements: NavElements = useMemo(
    () => [
      {
        title: 'Visualization',
        children: [
          { title: 'Design', to: Links.Home },
          { title: 'Source Code', to: Links.SourceCode },
        ],
      },
      {
        title: 'Beans',
        to: Links.Beans,
        hidden: () => !NAVIGATION_ELEMENTS.Beans.includes(currentSchemaType),
      },
      {
        title: 'Metadata',
        to: Links.Metadata,
        hidden: () => !NAVIGATION_ELEMENTS.Metadata.includes(currentSchemaType),
      },
      {
        title: 'Pipe ErrorHandler',
        to: Links.PipeErrorHandler,
        hidden: () => !NAVIGATION_ELEMENTS.PipeErrorHandler.includes(currentSchemaType),
      },
      {
        title: 'DataMapper',
        to: Links.DataMapper,
        hidden: () => !NAVIGATION_ELEMENTS.DataMapper.includes(currentSchemaType),
      },
      { title: 'Catalog', to: Links.Catalog },
    ],
    [currentSchemaType],
  );

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
                    data-testid={nav.title}
                    className={clsx({ 'pf-v5-u-hidden': nav.hidden?.() })}
                    hidden={nav.hidden?.()}
                    title={nav.title}
                    groupId={nav.title}
                    isActive={nav.children.some((child) => child.to === currentLocation.pathname)}
                    isExpanded
                  >
                    {nav.children.map((child) => (
                      <NavItem
                        id={child.title}
                        key={child.title}
                        data-testid={child.title}
                        itemId={index}
                        className={clsx({ 'pf-v5-u-hidden': child.hidden?.() })}
                        hidden={child.hidden?.()}
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
                <NavItem
                  id={nav.title}
                  className={clsx({ 'pf-v5-u-hidden': nav.hidden?.() })}
                  hidden={nav.hidden?.()}
                  key={nav.title}
                  data-testid={nav.title}
                  itemId={index}
                  isActive={currentLocation.pathname === nav.to}
                >
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

const NAVIGATION_ELEMENTS = {
  Beans: [SourceSchemaType.Route, SourceSchemaType.Kamelet],
  Metadata: [
    SourceSchemaType.Integration,
    SourceSchemaType.Kamelet,
    SourceSchemaType.KameletBinding,
    SourceSchemaType.Pipe,
  ],
  PipeErrorHandler: [SourceSchemaType.KameletBinding, SourceSchemaType.Pipe],
  DataMapper: [SourceSchemaType.Route, SourceSchemaType.Kamelet],
};
