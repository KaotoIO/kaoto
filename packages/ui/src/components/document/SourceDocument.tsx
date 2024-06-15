import { DocumentNode } from './Document';
import { DocumentNodeData } from '../../models/visualization';
import { FunctionComponent } from 'react';
import { IDocument } from '../../models/document';

type DocumentProps = {
  document: IDocument;
};

export const SourceDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const nodeData = new DocumentNodeData(document);
  return <DocumentNode nodeData={nodeData} />;
};
