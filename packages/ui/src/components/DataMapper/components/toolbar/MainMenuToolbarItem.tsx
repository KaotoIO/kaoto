import { FunctionComponent } from 'react';
import { useToggle } from '../../hooks';
import { Dropdown, DropdownList, MenuToggle, ToolbarItem } from '@patternfly/react-core';
import { ExportMappingFileDropdownItem } from './ExportMappingFileDropdownItem';
import { ImportMappingFileDropdownItem } from './ImportMappingFileDropdownItem';

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
          <ImportMappingFileDropdownItem onComplete={toggleOff} key={'import-mapping'} />
          <ExportMappingFileDropdownItem onComplete={toggleOff} key={'export-mapping'} />
        </DropdownList>
      </Dropdown>
    </ToolbarItem>
  );
};
