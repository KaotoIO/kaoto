import { FunctionComponent } from 'react';
import { useToggle } from '../../hooks/useToggle';
import { Divider, Dropdown, DropdownList, MenuToggle, ToolbarItem } from '@patternfly/react-core';
import { ExportMappingFileDropdownItem, ImportMappingFileDropdownItem, ResetDropdownItem } from './index';

export const MainMenuToolbarItem: FunctionComponent = () => {
  const { state: isOpen, toggle: onToggle, toggleOff } = useToggle(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <ToolbarItem>
      <Dropdown
        toggle={(toggleRef) => (
          <MenuToggle ref={toggleRef} id="main-menu-toggle" data-testid="main-menu-button" onClick={onToggle}>
            Data Mapper
          </MenuToggle>
        )}
        isOpen={isOpen}
        isPlain={true}
      >
        <DropdownList data-testid={'main-menu-dropdownlist'}>
          <ImportMappingFileDropdownItem onComplete={toggleOff} key="import-mapping" />
          <Divider key="import-separator" />
          <ExportMappingFileDropdownItem onComplete={toggleOff} key={'export-mapping'} />
          <Divider key="export-separator" />
          <ResetDropdownItem onComplete={toggleOff} key="reset" />
        </DropdownList>
      </Dropdown>
    </ToolbarItem>
  );
};
