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
import './DebugLayout.scss';

import { Stack, StackItem } from '@patternfly/react-core';
import { FunctionComponent, memo, useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { DataMapperDnDMonitor } from '../../../providers/dnd/DataMapperDndMonitor';
import { BrowserFilePickerMetadataProvider } from '../../../stubs/BrowserFilePickerMetadataProvider';
import { DataMapperControl } from '../DataMapperControl';
import { CanvasMonitor } from './CanvasMonitor';
import { ContextToolbar } from './ContextToolbar';
import { DataMapperMonitor } from './DataMapperMonitor';

export const DebugLayout: FunctionComponent = memo(function DebugLayout() {
  const { setDebug } = useDataMapper()!;
  useEffect(() => {
    setDebug(true);
  }, [setDebug]);

  return (
    <BrowserFilePickerMetadataProvider>
      <DataMapperMonitor />
      <CanvasMonitor />
      <DataMapperDnDMonitor />
      {/*
        The debugger is rendered inside Kaoto's main layout, which already provides a
        PatternFly Page. Rendering another Page here produced a Page-in-Page (issue #2263),
        so lay the toolbar and content out with a Stack instead. The filled StackItem
        re-establishes the definite height that SourceTargetView (height: 100%) needs to
        own its own scrolling.
      */}
      <Stack className="debug-layout">
        <StackItem>
          <ContextToolbar />
        </StackItem>
        <StackItem isFilled className="debug-layout__body">
          <DataMapperControl />
        </StackItem>
      </Stack>
    </BrowserFilePickerMetadataProvider>
  );
});
