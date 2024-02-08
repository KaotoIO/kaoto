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
import { FunctionComponent, useContext } from 'react';
import { Toolbar, ToolbarContent, ToolbarGroup } from '@patternfly/react-core';
import './Toolbar.css';
import {
  AboutToolbarItem,
  AddMappingToolbarItem,
  ToggleSourceTargetViewToolbarItem,
  ToggleMappedFieldsToolbarItem,
  ToggleMappingPreviewToolbarItem,
  ToggleMappingTableViewToolbarItem,
  ToggleNamespaceTableViewToolbarItem,
  ToggleTypesToolbarItem,
  ToggleUnmappedFieldsToolbarItem,
  MainMenuToolbarItem,
} from '../components/toolbarItems';
import { DataMapperContext } from '../providers';

export const ContextToolbar: FunctionComponent = () => {
  const { activeView } = useContext(DataMapperContext)!;

  return (
    <Toolbar id="data-toolbar" className="toolbar" role={'complementary'}>
      <ToolbarContent className="toolbarContent">
        {
          <ToolbarGroup variant="button-group" spacer={{ default: 'spacerMd' }}>
            <MainMenuToolbarItem />
          </ToolbarGroup>
        }
        <ToolbarGroup variant="icon-button-group" spacer={{ default: 'spacerMd' }}>
          <ToggleSourceTargetViewToolbarItem />
          <ToggleMappingTableViewToolbarItem />
          <ToggleNamespaceTableViewToolbarItem />
        </ToolbarGroup>
        <ToolbarGroup variant="icon-button-group">
          {(activeView === 'SourceTarget' || activeView === 'MappingTable') && <ToggleMappingPreviewToolbarItem />}
          {(activeView === 'SourceTarget' || activeView === 'MappingTable') && <ToggleTypesToolbarItem />}
          {activeView === 'SourceTarget' && <ToggleMappedFieldsToolbarItem />}
          {activeView === 'SourceTarget' && <ToggleUnmappedFieldsToolbarItem />}
          {(activeView === 'SourceTarget' || activeView === 'MappingTable') && <AddMappingToolbarItem />}
          {(activeView === 'SourceTarget' || activeView === 'MappingTable') && <AboutToolbarItem />}
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};
