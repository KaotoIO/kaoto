/*
    Copyright (C) 2024 Red Hat, Inc.

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
import { Brand, Panel, PanelHeader, PanelMain, PanelMainBody, Title } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import icon_component_datamapper from '../../assets/components/datamapper.png';

export const DataMapperNotYetInBrowserPage: FunctionComponent = () => {
  return (
    <Panel>
      <PanelHeader>
        <Brand src={icon_component_datamapper} alt="Kaoto DataMapper icon"></Brand>
        <Title headingLevel="h1">The Kaoto DataMapper cannot be configured</Title>
      </PanelHeader>
      <PanelMain>
        <PanelMainBody>
          <p>
            At the moment, the Kaoto DataMapper cannot be configured using the browser directly. Please use the Kaoto VS
            Code extension for an enhanced experience. The Kaoto extension can be found at the{' '}
            <a href="https://marketplace.visualstudio.com/items?itemName=redhat.vscode-kaoto">
              Visual Studio Code Marketplace{' '}
            </a>{' '}
            or in the <a href="https://open-vsx.org/extension/redhat/vscode-kaoto">Open VSX Registry</a>.
          </p>
        </PanelMainBody>
      </PanelMain>
    </Panel>
  );
};
