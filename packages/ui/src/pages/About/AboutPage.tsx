/*
    Copyright (C) 2025 Red Hat, Inc.

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
import './AboutPage.scss';

import { Bullseye, Content } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import logo from '../../assets/logo-kaoto-dark.png';
import { About } from '../../components/About/About';

export const AboutPage: FunctionComponent = () => {
  return (
    <Bullseye className="about-page">
      <img className="about-page-icon" src={logo} alt="Kaoto about page logo" />

      <About>
        <Content component="dt">
          <strong>VS Code Kaoto</strong>
        </Content>
        <Content component="dt">
          <strong>Version</strong>
        </Content>
        <Content component="dd" data-testid="about-vscode-version">
          {/* This is only available when running Kaoto through VS Code */}
          {__VSCODE_KAOTO_VERSION}
        </Content>
      </About>
    </Bullseye>
  );
};
