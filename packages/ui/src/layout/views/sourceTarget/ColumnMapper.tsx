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
import { Canvas, ICanvasProps } from '../../../_bk_atlasmap/UI/Canvas';
import { FunctionComponent } from 'react';
import { css } from '@patternfly/react-styles';
import './ColumnMapper.css';

export interface IColumnMapperProps extends ICanvasProps {}

export const ColumnMapper: FunctionComponent<IColumnMapperProps> = ({ className, children, ...props }) => {
  return (
    <Canvas {...props} className={css('canvas', className)}>
      {children}
    </Canvas>
  );
};
