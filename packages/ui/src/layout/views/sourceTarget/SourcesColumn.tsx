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
import { AtlasmapDocumentType, GroupId } from '../../../_bk_atlasmap/Views';
import { ImportButton } from '../../../_bk_atlasmap/Views';
import { Column, ColumnBody, NodeRef, SearchableColumnHeader } from '../../../_bk_atlasmap/UI';
import { IConstantsTreeCallbacks } from '../../../components/documents';
import { IPropertiesTreeCallbacks } from '../../../components/documents';
import { FunctionComponent, useCallback, useContext } from 'react';
import {
  SOURCES_CONSTANTS_ID,
  SOURCES_DOCUMENT_ID_PREFIX,
  SOURCES_HEIGHT_BOUNDARY_ID,
  SOURCES_PROPERTIES_ID,
  SOURCES_WIDTH_BOUNDARY_ID,
} from '../../../_bk_atlasmap/Views';

import { IMapping, IField, IDragAndDropField } from '../../../models';
import { DataMapperContext } from '../../../providers';
import { ConstantsDocument, SourceDocument, SourcePropertiesDocument } from '../../../components/documents';

export interface ISourceColumnCallbacks extends IConstantsTreeCallbacks, IPropertiesTreeCallbacks {
  acceptDropType: AtlasmapDocumentType;
  draggableType: AtlasmapDocumentType;
  isSource: boolean;
  onCreateConstant: () => void;
  onCreateProperty: (isSource: boolean) => void;
  onCustomClassSearch?: (isSource: boolean) => void;
  onCaptureDocumentID?: (id: string) => void;
  onChangeDocumentName?: (id: string, name: string) => void;
  onImportDocument?: (selectedFile: File) => void;
  onDeleteDocument?: (id: GroupId) => void;
  onSearch: (content: string) => void;
  canDrop: (source: IField, target: IDragAndDropField) => boolean;
  onDrop: (source: IField, target: IDragAndDropField | null) => void;
  onShowMappingDetails: (mapping: IMapping) => void;
  canAddFieldToSelectedMapping: (source: IField) => boolean;
  onAddToSelectedMapping: (source: IField) => void;
  canRemoveFromSelectedMapping: (source: IField) => boolean;
  canStartMapping: (field: IField) => boolean;
  onStartMapping: (field: IField) => void;
  onRemoveFromSelectedMapping: (source: IField) => void;
  shouldShowMappingPreviewForField: (field: IField) => boolean;
  onFieldPreviewChange: (field: IField, value: string) => void;
  canAddToSelectedMapping: (isSource: boolean) => boolean;
  onEditCSVParams: (id: string, isSource: boolean) => void;
}

export const SourcesColumn: FunctionComponent = () => {
  const { sources } = useContext(DataMapperContext)!;
  const onSearch = useCallback(() => {
    alert('not yet implemented');
  }, []);
  const onImportDocument = useCallback(() => {
    alert('not yet implemented');
  }, []);

  return (
    <Column data-testid={'column-source-area'} totalColumns={2}>
      <SearchableColumnHeader
        title={'Source'}
        onSearch={onSearch}
        actions={[onImportDocument && <ImportButton id="Source" onImport={onImportDocument} key={'import'} />]}
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
              {sources.map((s) => {
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
