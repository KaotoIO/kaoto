import { IDocument } from '../../models';
import { FunctionComponent } from 'react';
import { Document } from '.';
import { DocumentFooter } from './DocumentFooter';
export const TargetDocument: FunctionComponent<{ documentModel: IDocument }> = ({ documentModel }) => {
  return (
    <Document
      title={documentModel.name}
      startExpanded={true}
      footer={showTypes ? <DocumentFooter>Target document type: {documentModel.type}</DocumentFooter> : undefined}
      actions={
        documentModel.type === DocumentType.CSV
          ? [
              onCaptureDocumentID && (
                <CaptureDocumentIDAction
                  id={documentId}
                  onClick={() => onCaptureDocumentID(documentModel.id)}
                  key={'capture-tgt-csv-document-id'}
                />
              ),
              onEditCSVParams && (
                <EditCSVParamsAction
                  id={documentId}
                  onClick={() => onEditCSVParams(documentModel.id, false)}
                  key={'on-edit-tgt-csv-params'}
                />
              ),
              onDeleteDocument && (
                <DeleteDocumentAction
                  id={documentId}
                  onClick={() => onDeleteDocument(documentModel.id)}
                  key={'delete-tgt-csv-document'}
                />
              ),
            ]
          : [
              onCaptureDocumentID && (
                <CaptureDocumentIDAction
                  id={documentId}
                  onClick={() => onCaptureDocumentID(documentModel.id)}
                  key={'capture-tgt-document-id'}
                />
              ),
              onChangeDocumentName && (
                <ChangeDocumentNameAction
                  id={documentId}
                  onClick={() => onChangeDocumentName(documentModel.id, documentModel.name)}
                  key={'change-tgt-document-name'}
                />
              ),
              onDeleteDocument && (
                <DeleteDocumentAction
                  id={documentId}
                  onClick={() => onDeleteDocument(documentModel.id)}
                  key={'delete-tgt-documents'}
                />
              ),
            ]
      }
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
