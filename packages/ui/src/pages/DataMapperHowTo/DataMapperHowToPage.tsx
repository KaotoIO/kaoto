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
import { Bullseye, Title } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import icon_component_datamapper from '../../assets/components/datamapper.png';
import './DataMapperHowToPage.scss';

export const DataMapperHowToPage: FunctionComponent = () => {
  return (
    <Bullseye className="datamapper-howto">
      <img className="data-mapper-icon" src={icon_component_datamapper} alt="Kaoto DataMapper icon" />
      <Title headingLevel="h1">Looking to configure the Kaoto DataMapper?</Title>

      <section>
        <p>The Kaoto DataMapper is a powerful tool that allows you to map data between different formats.</p>
        <p>To get started, follow the steps below:</p>
        <ol>
          <li>
            Open the Kaoto DataMapper by selecting the <strong>DataMapper</strong> tab.
          </li>
          <li>
            Click the <strong>+</strong> button to add a new mapping.
          </li>
          <li>Drag and drop fields from the source and target schemas to create your mapping.</li>
          <li>
            Click <strong>Save</strong> to save your mapping.
          </li>
        </ol>
      </section>
    </Bullseye>
  );
};
