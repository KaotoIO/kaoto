/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import {
  Dropdown,
  DropdownItem,
  Divider,
  MenuToggle,
  MenuToggleElement,
  MenuToggleAction,
} from '@patternfly/react-core';
import {
  FolderCloseIcon,
  FolderOpenIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import { FunctionComponent, useState } from 'react';

export interface IDocumentActions {
  onExpandFields: () => void;
  onCollapseFields: () => void;
  onDelete: () => void;
}

export const DocumentActions: FunctionComponent<IDocumentActions> = ({
  onExpandFields,
  onCollapseFields,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);
  const toggleActions = () =>  setShowActions(!showActions);


  return (
    <Dropdown
      toggle={(toggleRef: React.Ref<MenuToggleElement>) =>
        <MenuToggle
          ref={toggleRef}
          splitButtonOptions={{ items: [
            <MenuToggleAction key="action" onClick={onExpandFields}>
              <FolderOpenIcon />
            </MenuToggleAction>,
          ]}}
          variant="primary"
          onClick={toggleActions}
        />
      }
      isOpen={showActions}
      >
        <DropdownItem
          icon={<FolderCloseIcon />}
          key={'collapse'}
          onClick={onCollapseFields}
        >
          Collapse all
        </DropdownItem>,
        <Divider key={'sep-1'} />,
        <DropdownItem icon={<TrashIcon />} key={'delete'} onClick={onDelete}>
          Remove instance or schema file
        </DropdownItem>,
</Dropdown>
  );
};
