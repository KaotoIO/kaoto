import './AppMenuDropdown.scss';

import { MenuButton, MenuItem, MenuItemDivider, MenuItemGroup } from '@carbon/react';
import { FunctionComponent, useState } from 'react';
import { useNavigate } from 'react-router';

import { KaotoAboutModal } from '../../About/KaotoAboutModal';

interface AppMenuDropdownProps {
  projectId: string;
}

const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const AppMenuDropdown: FunctionComponent<AppMenuDropdownProps> = ({ projectId }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <MenuButton
        label="Menu"
        kind="ghost"
        size="sm"
        menuAlignment="bottom-start"
        className="cs--app-menu-dropdown cs--app-menu-dropdown__toggle"
        data-testid="app-menu-dropdown"
      >
        <MenuItemGroup label="Navigate">
          <MenuItem
            label="Settings"
            onClick={() => {
              void navigate(`/projects/${projectId}/config`);
            }}
          />
          <MenuItem
            label="About"
            onClick={() => {
              setIsAboutOpen(true);
            }}
          />
        </MenuItemGroup>
        <MenuItemDivider />
        <MenuItemGroup label="Links">
          <MenuItem
            label="Tutorials"
            onClick={() => {
              openExternal('https://kaoto.io/workshop/');
            }}
          />
          <MenuItem
            label="Help"
            onClick={() => {
              openExternal('https://kaoto.io/docs/');
            }}
          />
          <MenuItem
            label="Examples"
            onClick={() => {
              openExternal('https://github.com/KaotoIO/kaoto-examples');
            }}
          />
          <MenuItem
            label="Feedback"
            onClick={() => {
              openExternal('https://github.com/KaotoIO/kaoto/issues/new/choose');
            }}
          />
          <MenuItem
            label="Apache Camel"
            onClick={() => {
              openExternal('https://camel.apache.org/camel-core/getting-started/index.html');
            }}
          />
          <MenuItem
            label="Hawtio"
            onClick={() => {
              openExternal('https://hawt.io/docs/get-started.html');
            }}
          />
        </MenuItemGroup>
      </MenuButton>

      <KaotoAboutModal
        isOpen={isAboutOpen}
        onClose={() => {
          setIsAboutOpen(false);
        }}
      />
    </>
  );
};
