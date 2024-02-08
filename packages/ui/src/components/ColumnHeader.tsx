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
import { FunctionComponent, PropsWithChildren, ReactElement } from 'react';

import { Actions } from '../_bk_atlasmap/UI/Actions';

import { Title } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import './ColumnHeader.css';

export interface IColumnHeaderProps extends PropsWithChildren {
  title: string;
  variant?: 'default' | 'plain';
  actions?: (ReactElement | null | undefined)[];
}

export const ColumnHeader: FunctionComponent<IColumnHeaderProps> = ({ title, actions, variant, children }) => {
  return (
    <div className="header">
      <div className={css('toolbar', variant === 'plain' && 'plain')}>
        <div className="title">
          <Title headingLevel="h2" size="lg">
            {title}
          </Title>
        </div>
        <Actions>{actions?.filter((a) => a)}</Actions>
      </div>
      {children}
    </div>
  );
};
