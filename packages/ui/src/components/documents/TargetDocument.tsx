import { IDocument } from '../../models';
import { FunctionComponent } from 'react';
import { Document, Tree } from '.';
import { DocumentFooter } from './DocumentFooter';
import { useDataMapperContext } from '../../hooks';
import { DeleteDocumentButton } from './DeleteDocumentButton';
import { TraverseFields } from '../fields';
import {
  TARGETS_FIELD_ID_PREFIX,
  TARGETS_HEIGHT_BOUNDARY_ID,
  TARGETS_WIDTH_BOUNDARY_ID,
} from '../../layout/views/sourceTarget/constants';

export const TargetDocument: FunctionComponent<{ documentModel: IDocument }> = ({ documentModel }) => {
  const { showTypes } = useDataMapperContext();
  const onDeleteDocument = (_id: string) => {
    alert('not yet implemented');
  };
  return (
    <Document
      title={documentModel.name}
      startExpanded={true}
      footer={showTypes ? <DocumentFooter>Target document type: {documentModel.type}</DocumentFooter> : undefined}
      actions={[
        onDeleteDocument && (
          <DeleteDocumentButton
            id={documentModel.id}
            onClick={() => onDeleteDocument(documentModel.id)}
            key={'delete-tgt-documents'}
          />
        ),
      ]}
      noPadding={true}
    >
      <Tree>
        <TraverseFields
          fields={documentModel.fields}
          showTypes={showTypes}
          boundaryId={TARGETS_HEIGHT_BOUNDARY_ID}
          overrideWidth={TARGETS_WIDTH_BOUNDARY_ID}
          parentId={documentId}
          idPrefix={TARGETS_FIELD_ID_PREFIX}
          acceptDropType={acceptDropType}
          draggableType={draggableType}
          onDrop={onDrop}
          canDrop={canDrop}
          renderActions={(field) =>
            commonActions({
              connectedMappings: field.mappings,
              onShowMappingDetails,
              canAddFieldToSelectedMapping: canAddFieldToSelectedMapping(field),
              onAddToSelectedMapping: () => onAddToSelectedMapping(field),
              canRemoveFromSelectedMapping: canRemoveFromSelectedMapping(field),
              onRemoveFromSelectedMapping: () => onRemoveFromSelectedMapping(field),
              canStartMapping: canStartMapping(field),
              onStartMapping: () => onStartMapping(field),
            })
          }
          renderPreview={renderPreviewResult}
        />
      </Tree>
    </Document>
  );
};
