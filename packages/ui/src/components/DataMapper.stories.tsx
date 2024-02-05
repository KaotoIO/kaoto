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
import { DataMapperProvider } from '../providers/DataMapperProvider';
import { boolean } from '@storybook/addon-knobs';

import { DataMapper } from './DataMapper';
import { action } from '@storybook/addon-actions';

const obj = {
  title: 'AtlasMap|Demo',
};
export default obj;

export const wiredToTheBackend = () => (
  <DataMapperProvider onMappingChange={action('onMappingChange')}>
    <DataMapper
      allowImport={boolean('allow Import', true)}
      allowExport={boolean('allow Export', true)}
      allowReset={boolean('allow Reset', true)}
      allowDelete={boolean('allow Delete', true)}
      allowCustomJavaClasses={boolean('allow Custom Java Classes', true)}
      toolbarOptions={{
        showToggleMappingPreviewToolbarItem: boolean('showToggleMappingPreviewToolbarItem', true),
        showMappingTableViewToolbarItem: boolean('showToggleMappingTableToolbarItem', true),
        showNamespaceTableViewToolbarItem: boolean('showToggleNamespaceTableToolbarItem', true),
        showToggleTypesToolbarItem: boolean('showToggleTypesToolbarItem', true),
        showToggleMappedFieldsToolbarItem: boolean('showToggleMappedFieldsToolbarItem', true),
        showToggleUnmappedFieldsToolbarItem: boolean('showToggleUnmappedFieldsToolbarItem', true),
      }}
    />
  </DataMapperProvider>
);
