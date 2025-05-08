import { FunctionComponent } from 'react';
import { useToggle } from '../../../hooks/useToggle';
import { Dropdown, DropdownList, MenuToggle, ToolbarItem } from '@patternfly/react-core';
import { ExportMappingFileDropdownItem } from './ExportMappingFileDropdownItem';
import { ImportMappingFileDropdownItem } from './ImportMappingFileDropdownItem';
import { ResetMappingsDropdownItem } from './ResetMappingsDropdownItem';

export const MainMenuToolbarItem: FunctionComponent = () => {
  const { state: isOpen, toggle: onToggle, toggleOff } = useToggle(false);
  return (
    <ToolbarItem>
      <Dropdown
        toggle={(toggleRef) => (
          <MenuToggle ref={toggleRef} id="main-menu-toggle" data-testid="dm-debug-main-menu-button" onClick={onToggle}>
            DataMapper Debugger
          </MenuToggle>
        )}
        isOpen={isOpen}
        isPlain={true}
      >
        <DropdownList data-testid={'dm-debug-main-menu-dropdownlist'}>
          <ImportMappingFileDropdownItem onComplete={toggleOff} key={'import-mapping'} />
          <ExportMappingFileDropdownItem onComplete={toggleOff} key={'export-mapping'} />
          <ResetMappingsDropdownItem onComplete={toggleOff} key={'reset-mappings'} />
        </DropdownList>
      </Dropdown>
    </ToolbarItem>
  );
};
