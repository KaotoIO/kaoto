import { Nav, NavItem, NavList, PageSidebar, PageSidebarBody } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Links } from '../router/links';

interface INavigationSidebar {
  isNavOpen: boolean;
}

export const NavigationSidebar: FunctionComponent<INavigationSidebar> = (props) => {
  const [activeItem, setActiveItem] = useState(0);

  const onSelect = (result: { itemId: number | string }) => {
    setActiveItem(result.itemId as number);
  };

  return (
    <PageSidebar isSidebarOpen={props.isNavOpen} id="vertical-sidebar">
      <PageSidebarBody>
        <Nav
          onSelect={(_event, result: { itemId: number | string }) => onSelect(result)}
          aria-label="Default global nav"
        >
          <NavList>
            {navElements.map((nav, index) => (
              <NavItem id={nav.title} key={nav.title} itemId={index} isActive={activeItem === index}>
                <Link to={nav.to}>{nav.title}</Link>
              </NavItem>
            ))}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );
};

const navElements = [
  { title: 'Visualization', to: Links.Home },
  { title: 'Beans', to: Links.Beans },
  { title: 'Rest', to: Links.Rest },
];
