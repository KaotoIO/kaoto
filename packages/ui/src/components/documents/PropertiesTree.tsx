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
import { AtlasmapDocumentType } from '../../_bk_atlasmap/Views/models';
import { Button, Tooltip } from '@patternfly/react-core';
import { EditIcon, TrashIcon } from '@patternfly/react-icons';
import { Tree } from '.';
import { ITraverseFieldsProps, TraverseFields } from '../fields/TraverseFields';
import { FunctionComponent } from 'react';
import {
  SOURCES_FIELD_ID_PREFIX,
  SOURCES_HEIGHT_BOUNDARY_ID,
  SOURCES_PROPERTIES_ID,
  SOURCES_WIDTH_BOUNDARY_ID,
  TARGETS_FIELD_ID_PREFIX,
  TARGETS_HEIGHT_BOUNDARY_ID,
  TARGETS_PROPERTIES_ID,
  TARGETS_WIDTH_BOUNDARY_ID,
} from '../../_bk_atlasmap/Views/ColumnMapperView/Columns/constants';

import { commonActions } from '../../_bk_atlasmap/Views/ColumnMapperView/Columns/commonActions';
import { IMapping, IDocument, IField, IDragAndDropField } from '../../models';

export interface IPropertiesTreeCallbacks {
  acceptDropType: AtlasmapDocumentType;
  draggableType: AtlasmapDocumentType;
  isSource: boolean;
  onDrop: (source: IField, target: IDragAndDropField | null) => void;
  canDrop: (source: IField, target: IDragAndDropField) => boolean;
  onShowMappingDetails: (mapping: IMapping) => void;
  canAddFieldToSelectedMapping: (source: IField) => boolean;
  onAddToSelectedMapping: (source: IField) => void;
  canRemoveFromSelectedMapping: (source: IField) => boolean;
  onRemoveFromSelectedMapping: (source: IField) => void;
  onEditProperty: (name: string, scope: string, isSource: boolean) => void;
  onDeleteProperty: (name: string, scope: string, isSource: boolean) => void;
  canStartMapping: (field: IField) => boolean;
  onStartMapping: (field: IField) => void;
}

export interface IPropertiesTreeProps extends IPropertiesTreeCallbacks {
  fields: IDocument['fields'];
  showTypes: boolean;
  renderPreview: ITraverseFieldsProps['renderPreview'];
}

export const PropertiesTree: FunctionComponent<IPropertiesTreeProps> = ({
  acceptDropType,
  draggableType,
  isSource,
  fields,
  showTypes,
  onDrop,
  canDrop,
  onShowMappingDetails,
  canAddFieldToSelectedMapping,
  onAddToSelectedMapping,
  canRemoveFromSelectedMapping,
  onRemoveFromSelectedMapping,
  onEditProperty,
  onDeleteProperty,
  canStartMapping,
  onStartMapping,
  renderPreview,
}) => (
  <Tree>
    <TraverseFields
      fields={fields}
      showTypes={showTypes}
      parentId={isSource ? SOURCES_PROPERTIES_ID : TARGETS_PROPERTIES_ID}
      boundaryId={isSource ? SOURCES_HEIGHT_BOUNDARY_ID : TARGETS_HEIGHT_BOUNDARY_ID}
      overrideWidth={isSource ? SOURCES_WIDTH_BOUNDARY_ID : TARGETS_WIDTH_BOUNDARY_ID}
      idPrefix={isSource ? SOURCES_FIELD_ID_PREFIX : TARGETS_FIELD_ID_PREFIX}
      acceptDropType={acceptDropType}
      draggableType={draggableType}
      onDrop={onDrop}
      canDrop={canDrop}
      renderActions={(field) => [
        ...commonActions({
          connectedMappings: field.mappings,
          onShowMappingDetails: onShowMappingDetails,
          canAddFieldToSelectedMapping: canAddFieldToSelectedMapping(field),
          onAddToSelectedMapping: () => onAddToSelectedMapping(field),
          canRemoveFromSelectedMapping: canRemoveFromSelectedMapping(field),
          onRemoveFromSelectedMapping: () => onRemoveFromSelectedMapping(field),
          canStartMapping: canStartMapping(field),
          onStartMapping: () => onStartMapping(field),
        }),
        <Tooltip
          key={'edit'}
          position={'top'}
          enableFlip={true}
          content={<div>Edit property</div>}
          entryDelay={750}
          exitDelay={100}
        >
          <Button
            variant="plain"
            onClick={() => onEditProperty(field.name, field.scope, isSource)}
            aria-label={'Edit property'}
            tabIndex={0}
            data-testid={`edit-property-${field.name}-button`}
          >
            <EditIcon />
          </Button>
        </Tooltip>,
        <Tooltip
          key={'delete'}
          position={'top'}
          enableFlip={true}
          content={<div>Remove property</div>}
          entryDelay={750}
          exitDelay={100}
        >
          <Button
            variant="plain"
            onClick={() => onDeleteProperty(field.name, field.scope, isSource)}
            aria-label={'Remove property'}
            tabIndex={0}
            data-testid={`remove-property-${field.name}-button`}
          >
            <TrashIcon />
          </Button>
        </Tooltip>,
      ]}
      renderPreview={renderPreview}
    />
  </Tree>
);
