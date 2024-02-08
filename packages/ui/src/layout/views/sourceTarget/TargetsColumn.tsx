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
import { AtlasmapDocumentType, GroupId } from '../../../_bk_atlasmap/Views/models';
import { ImportDocumentButton } from '../../../_bk_atlasmap/Views/ColumnMapperView/Actions';
import { NodeRef, SearchableColumnHeader } from '../../../_bk_atlasmap/UI';
import { IPropertiesTreeCallbacks } from '../../../components/documents/PropertiesTree';
import { FunctionComponent, useCallback, useContext } from 'react';
import {
  TARGETS_DOCUMENT_ID_PREFIX,
  TARGETS_HEIGHT_BOUNDARY_ID,
  TARGETS_PROPERTIES_ID,
  TARGETS_WIDTH_BOUNDARY_ID,
} from '../../../_bk_atlasmap/Views/ColumnMapperView/Columns/constants';

import { IMapping, IDocument, IField, IDragAndDropField } from '../../../models';
import { TargetDocument, TargetPropertiesDocument } from '../../../components/documents';
import { DataMapperContext } from '../../../providers';
import { Column, ColumnBody } from '.';
export interface ITargetsColumnCallbacks extends IPropertiesTreeCallbacks {
  acceptDropType: AtlasmapDocumentType;
  draggableType: AtlasmapDocumentType;
  isSource: boolean;
  onCreateProperty: (isSource: boolean) => void;
  onCaptureDocumentID?: (id: string) => void;
  onChangeDocumentName?: (id: string, name: string) => void;
  onDeleteDocument?: (id: GroupId) => void;
  onImportDocument?: (selectedFile: File) => void;
  onCustomClassSearch?: (isSource: boolean) => void;
  onSearch: (content: string) => void;
  onDrop: (source: IField, target: IDragAndDropField | null) => void;
  canDrop: (source: IField, target: IDragAndDropField) => boolean;
  onShowMappingDetails: (mapping: IMapping) => void;
  canAddFieldToSelectedMapping: (field: IField) => boolean;
  onAddToSelectedMapping: (field: IField) => void;
  canRemoveFromSelectedMapping: (field: IField) => boolean;
  onRemoveFromSelectedMapping: (field: IField) => void;
  canStartMapping: (field: IField) => boolean;
  onStartMapping: (field: IField) => void;
  shouldShowMappingPreviewForField: (field: IField) => boolean;
  onFieldPreviewChange: (field: IField, value: string) => void;
  canAddToSelectedMapping: (isSource: boolean) => boolean;
  onEditCSVParams: (id: string, isSource: boolean) => void;
}

export interface ITargetsColumnData {
  targetProperties?: IDocument | null;
  showMappingPreview: boolean;
  showTypes: boolean;
  targets: Array<IDocument>;
}

export const TargetsColumn: FunctionComponent = () => {
  const { targets } = useContext(DataMapperContext)!;
  const onSearch = useCallback(() => {
    alert('not yet implemented');
  }, []);
  const onImportDocument = useCallback(() => {
    alert('not yet implemented');
  }, []);

  return (
    <Column data-testid={'column-target-area'} totalColumns={2}>
      <SearchableColumnHeader
        title={'Target'}
        onSearch={onSearch}
        actions={[onImportDocument && <ImportDocumentButton id="Target" onImport={onImportDocument} key={'import'} />]}
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
              {targets.map((t) => {
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
