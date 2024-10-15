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
import { FunctionComponent, memo, useEffect } from 'react';
import { Masthead, MastheadContent, Page, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { ContextToolbar } from './ContextToolbar';
import './DebugLayout.scss';
import { DataMapperControl } from '../DataMapperControl';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { CanvasMonitor } from './CanvasMonitor';
import { DataMapperMonitor } from './DataMapperMonitor';
import { BrowserFilePickerMetadataProvider } from '../../../stubs/BrowserFilePickerMetadataProvider';

export const DebugLayout: FunctionComponent = memo(function DebugLayout() {
  const { setDebug } = useDataMapper()!;
  useEffect(() => {
    setDebug(true);
  }, [setDebug]);

  const header = (
    <Masthead>
      <MastheadContent>
        <ContextToolbar />
      </MastheadContent>
    </Masthead>
  );

  return (
    <Page header={header}>
      <BrowserFilePickerMetadataProvider>
        <DataMapperMonitor />
        <CanvasMonitor />
        <PageSection variant={PageSectionVariants.default} className="debug-layout">
          <DataMapperControl />
        </PageSection>
      </BrowserFilePickerMetadataProvider>
    </Page>
  );
});
