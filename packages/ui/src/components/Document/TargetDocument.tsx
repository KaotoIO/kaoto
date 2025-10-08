import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import './Document.scss';
import { TargetDocumentNode } from './TargetDocumentNode';

type DocumentProps = {
  document: IDocument;
};

export const TargetDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const { mappingTree } = useDataMapper();
  const nodeData = new TargetDocumentNodeData(document, mappingTree);

  return (
    <TargetDocumentNode
      nodeData={nodeData}
      expandAll={document.totalFieldCount < 100}
      initialExpandedRank={1}
      rank={0}
    />
  );
};
