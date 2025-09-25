import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import './Document.scss';
import { SourceDocumentNode } from './SourceDocumentNode';

type DocumentProps = {
  document: IDocument;
  isReadOnly: boolean;
};

export const SourceDocument: FunctionComponent<DocumentProps> = ({ document, isReadOnly }) => {
  const { initialExpandedFieldRank, maxTotalFieldCountToExpandAll } = useDataMapper();
  const nodeData = new DocumentNodeData(document);
  return (
    <SourceDocumentNode
      nodeData={nodeData}
      isReadOnly={isReadOnly}
      expandAll={document.totalFieldCount < maxTotalFieldCountToExpandAll}
      initialExpandedRank={initialExpandedFieldRank}
      rank={0}
    />
  );
};
