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
import { NodeRef } from '../../../components/NodeRef';
import { SearchableColumnHeader } from '../../../components/SearchableColumnHeader';
import { FunctionComponent, useCallback } from 'react';
import {
  TARGETS_DOCUMENT_ID_PREFIX,
  TARGETS_HEIGHT_BOUNDARY_ID,
  TARGETS_PROPERTIES_ID,
  TARGETS_WIDTH_BOUNDARY_ID,
} from './constants';

import { TargetDocument, TargetPropertiesDocument } from '../../../components/documents';
import { Column, ColumnBody } from '.';
import { useDataMapperContext } from '../../../hooks';

export const TargetsColumn: FunctionComponent = () => {
  const { targetDocuments } = useDataMapperContext();
  const onSearch = useCallback(() => {
    alert('not yet implemented');
  }, []);

  return (
    <Column data-testid={'column-target-area'} totalColumns={2}>
      <SearchableColumnHeader
        title={'Target'}
        onSearch={onSearch}
        actions={[<ImportDocumentButton isSource={false} key={'import'} />]}
      />
      <NodeRef id={TARGETS_HEIGHT_BOUNDARY_ID}>
        <ColumnBody>
          <NodeRef id={TARGETS_WIDTH_BOUNDARY_ID}>
            <div>
              <NodeRef
                id={TARGETS_PROPERTIES_ID}
                boundaryId={TARGETS_HEIGHT_BOUNDARY_ID}
                overrideWidth={TARGETS_WIDTH_BOUNDARY_ID}
              >
                <TargetPropertiesDocument />
              </NodeRef>
              {targetDocuments.map((t) => {
                const documentId = `${TARGETS_DOCUMENT_ID_PREFIX}${t.id}`;
                return (
                  <NodeRef
                    key={t.id}
                    id={documentId}
                    boundaryId={TARGETS_HEIGHT_BOUNDARY_ID}
                    overrideWidth={TARGETS_WIDTH_BOUNDARY_ID}
                  >
                    <TargetDocument documentModel={t} />
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
