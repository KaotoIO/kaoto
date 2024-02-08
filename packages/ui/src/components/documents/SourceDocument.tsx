import { FunctionComponent } from 'react';
import { IDocument } from '../../models';
import { DocumentFooter, Tree } from '../../_bk_atlasmap/UI';
import { TraverseFields } from '../fields';
import { Document } from '../index';

export type SourceDocumentProps = {
  documentModel: IDocument;
};

export const SourceDocument: FunctionComponent<SourceDocumentProps> = ({ documentModel }) => {
  return (
    <Document
      title={documentModel.name}
      startExpanded={true}
      footer={showTypes ? <DocumentFooter>Source document type: {documentModel.type}</DocumentFooter> : undefined}
      actions={
        documentModel.type === DocumentType.CSV
          ? [
              onCaptureDocumentID && (
                <CaptureDocumentIDAction
                  id={documentId}
                  onClick={() => onCaptureDocumentID(documentModel.id)}
                  key={'capture-document-id'}
                />
              ),
              onEditCSVParams && (
                <EditCSVParamsAction
                  id={documentId}
                  onClick={() => onEditCSVParams(documentModel.id, true)}
                  key={'on-edit-csv-params'}
                />
              ),
              onDeleteDocument && (
                <DeleteDocumentAction
                  id={documentId}
                  onClick={() => onDeleteDocument(documentModel.id)}
                  key={'delete-document'}
                />
              ),
            ]
          : [
              onCaptureDocumentID && (
                <CaptureDocumentIDAction
                  id={documentId}
                  onClick={() => onCaptureDocumentID(documentModel.id)}
                  key={'capture-document-id'}
                />
              ),
              onChangeDocumentName && (
                <ChangeDocumentNameAction
                  id={documentId}
                  onClick={() => onChangeDocumentName(documentModel.id, documentModel.name)}
                  key={'change-document-name'}
                />
              ),
              onDeleteDocument && (
                <DeleteDocumentAction
                  id={documentId}
                  onClick={() => onDeleteDocument(documentModel.id)}
                  key={'delete-document'}
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
          boundaryId={SOURCES_HEIGHT_BOUNDARY_ID}
          overrideWidth={SOURCES_WIDTH_BOUNDARY_ID}
          parentId={documentId}
          idPrefix={SOURCES_FIELD_ID_PREFIX}
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
          renderPreview={renderPreview}
        />
      </Tree>
    </Document>
  );
};
