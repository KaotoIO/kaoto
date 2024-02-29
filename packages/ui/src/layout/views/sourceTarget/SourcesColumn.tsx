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
import { ImportDocumentButton } from './ImportDocumentButton';
import { Column, ColumnBody } from '.';
import { NodeRef } from '../../../components/NodeRef';
import { SearchableColumnHeader } from '../../../components/SearchableColumnHeader';
import { FunctionComponent, useCallback } from 'react';
import {
  SOURCES_CONSTANTS_ID,
  SOURCES_DOCUMENT_ID_PREFIX,
  SOURCES_HEIGHT_BOUNDARY_ID,
  SOURCES_PROPERTIES_ID,
  SOURCES_WIDTH_BOUNDARY_ID,
} from './constants';

import { ConstantsDocument, SourceDocument, SourcePropertiesDocument } from '../../../components/documents';
import { useDataMapperContext } from '../../../hooks';

export const SourcesColumn: FunctionComponent = () => {
  const { sourceDocuments } = useDataMapperContext();
  const onSearch = useCallback(() => {
    alert('not yet implemented');
  }, []);
  console.log('rerender sources');
  return (
    <Column data-testid={'column-source-area'} totalColumns={2}>
      <SearchableColumnHeader
        title={'Source'}
        onSearch={onSearch}
        actions={[<ImportDocumentButton isSource={true} key={'import'} />]}
      />
      <NodeRef id={SOURCES_HEIGHT_BOUNDARY_ID}>
        <ColumnBody>
          <NodeRef id={SOURCES_WIDTH_BOUNDARY_ID}>
            <div>
              <NodeRef
                id={SOURCES_PROPERTIES_ID}
                boundaryId={SOURCES_HEIGHT_BOUNDARY_ID}
                overrideWidth={SOURCES_WIDTH_BOUNDARY_ID}
              >
                <SourcePropertiesDocument />
              </NodeRef>
              <NodeRef
                id={SOURCES_CONSTANTS_ID}
                boundaryId={SOURCES_HEIGHT_BOUNDARY_ID}
                overrideWidth={SOURCES_WIDTH_BOUNDARY_ID}
              >
                <ConstantsDocument />
              </NodeRef>
              {sourceDocuments.map((s) => {
                const documentId = `${SOURCES_DOCUMENT_ID_PREFIX}${s.id}`;
                return (
                  <NodeRef
                    key={s.id}
                    id={documentId}
                    boundaryId={SOURCES_HEIGHT_BOUNDARY_ID}
                    overrideWidth={SOURCES_WIDTH_BOUNDARY_ID}
                  >
                    <SourceDocument documentModel={s} />
                  </NodeRef>
                );
              })}
            </div>
          </NodeRef>
        </ColumnBody>
      </NodeRef>
    </Column>
  );
};
