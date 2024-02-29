import { FunctionComponent } from 'react';
import { IDocument } from '../../models';
import { DocumentFooter, Tree } from '.';
import { TraverseFields } from '../fields';
import { Document } from '../index';
import { useDataMapperContext } from '../../hooks';
import { DeleteDocumentButton } from './DeleteDocumentButton';
import {
  SOURCES_FIELD_ID_PREFIX,
  SOURCES_HEIGHT_BOUNDARY_ID,
  SOURCES_WIDTH_BOUNDARY_ID,
} from '../../layout/views/sourceTarget/constants';
import { commonActions } from './commonActions';

export type SourceDocumentProps = {
  documentModel: IDocument;
};

export const SourceDocument: FunctionComponent<SourceDocumentProps> = ({ documentModel }) => {
  const { showTypes } = useDataMapperContext();
  const onDeleteDocument = (_id: string) => {
    console.log('not yet implemented');
  };
  return (
    <Document
      title={documentModel.name}
      startExpanded={true}
      footer={showTypes ? <DocumentFooter>Source document type: {documentModel.type}</DocumentFooter> : undefined}
      actions={[
        onDeleteDocument && (
          <DeleteDocumentButton
            id={documentModel.id}
            onClick={() => onDeleteDocument(documentModel.id)}
            key={'delete-document'}
          />
        ),
      ]}
      noPadding={true}
    >
      <Tree>
        <TraverseFields
          fields={documentModel.fields}
          showTypes={showTypes}
          boundaryId={SOURCES_HEIGHT_BOUNDARY_ID}
          overrideWidth={SOURCES_WIDTH_BOUNDARY_ID}
          parentId={documentModel.id}
          idPrefix={SOURCES_FIELD_ID_PREFIX}
          acceptDropType={'target'}
          draggableType={'source'}
          onDrop={() => alert('onDrop')}
          canDrop={() => true}
          renderActions={(field) =>
            commonActions({
              connectedMappings: field.mappings,
              onShowMappingDetails: () => alert('onShowMappingDetails'),
              canAddFieldToSelectedMapping: true,
              onAddToSelectedMapping: () => alert('onAddToSelectedMapping'),
              canRemoveFromSelectedMapping: true,
              onRemoveFromSelectedMapping: () => alert('onRemoveFromSelectedMapping'),
              canStartMapping: true,
              onStartMapping: () => alert('onStartMapping'),
            })
          }
          renderPreview={() => 'renderPreview'}
        />
      </Tree>
    </Document>
  );
};
