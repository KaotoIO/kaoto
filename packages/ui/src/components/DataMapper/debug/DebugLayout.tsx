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
import { Masthead, Page, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { FunctionComponent, memo, useEffect } from 'react';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { BrowserFilePickerMetadataProvider } from '../../../stubs/BrowserFilePickerMetadataProvider';
import { DataMapperControl } from '../DataMapperControl';
import { CanvasMonitor } from './CanvasMonitor';
import { ContextToolbar } from './ContextToolbar';
import { DataMapperMonitor } from './DataMapperMonitor';
import './DebugLayout.scss';

export const DebugLayout: FunctionComponent = memo(function DebugLayout() {
  const { setDebug } = useDataMapper()!;
  useEffect(() => {
    setDebug(true);
  }, [setDebug]);

  const header = (
    <Masthead>
      <ContextToolbar />
    </Masthead>
  );

  return (
    <Page isContentFilled masthead={header}>
      <BrowserFilePickerMetadataProvider>
        <DataMapperMonitor />
        <CanvasMonitor />
        <PageSection isFilled hasBodyWrapper={false} variant={PageSectionVariants.default} className="debug-layout">
          <DataMapperControl />
        </PageSection>
      </BrowserFilePickerMetadataProvider>
    </Page>
  );
});
