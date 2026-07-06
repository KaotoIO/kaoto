import { Dropdown, DropdownList, MenuToggle, MenuToggleElement, ToolbarItem } from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useState } from 'react';

import { useToggle } from '../../../hooks/useToggle';
import { ExportMappingFileDropdownItem } from './ExportMappingFileDropdownItem';
import { ExportMappingFileModal } from './ExportMappingFileModal';
import { ImportMappingFileDropdownItem } from './ImportMappingFileDropdownItem';
import { ResetMappingsDropdownItem } from './ResetMappingsDropdownItem';

const MainMenuToggle: FunctionComponent<{ toggleRef: Ref<MenuToggleElement>; onClick: () => void }> = ({
  toggleRef,
  onClick,
}) => (
  <MenuToggle ref={toggleRef} id="main-menu-toggle" data-testid="dm-debug-main-menu-button" onClick={onClick}>
    DataMapper Debugger
  </MenuToggle>
);

export const MainMenuToolbarItem: FunctionComponent = () => {
  const { state: isOpen, toggle: onToggle, toggleOff } = useToggle(false);
  const [isExportFileModalOpen, setIsExportFileModalOpen] = useState<boolean>(false);

  const handleOpenExportModal = () => {
    setIsExportFileModalOpen(true);
    toggleOff();
  };

  const renderToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => <MainMenuToggle toggleRef={toggleRef} onClick={onToggle} />,
    [onToggle],
  );

  return (
    <ToolbarItem>
      <Dropdown toggle={renderToggle} isOpen={isOpen} isPlain>
        <DropdownList data-testid="dm-debug-main-menu-dropdownlist">
          <ImportMappingFileDropdownItem onComplete={toggleOff} key="import-mapping" />
          <ExportMappingFileDropdownItem onClick={handleOpenExportModal} key="export-mapping" />
          <ResetMappingsDropdownItem onComplete={toggleOff} key="reset-mappings" />
        </DropdownList>
      </Dropdown>
      <ExportMappingFileModal
        isOpen={isExportFileModalOpen}
        onClose={() => {
          setIsExportFileModalOpen(false);
        }}
      />
    </ToolbarItem>
  );
};
