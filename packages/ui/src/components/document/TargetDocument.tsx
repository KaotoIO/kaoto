import { IDocument } from '../../models/document';
import { DocumentNode } from './Document';
import { FunctionComponent, useCallback } from 'react';
import { useDataMapper } from '../../hooks';
import { DocumentNodeData } from '../../models/visualization';
import { TargetNodeActions } from './actions/TargetNodeActions';

type DocumentProps = {
  document: IDocument;
};

export const TargetDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();
  const nodeData = new DocumentNodeData(document, mappingTree);
  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

  const nodeActions = <TargetNodeActions nodeData={nodeData} onUpdate={handleUpdate} />;

  return <DocumentNode nodeData={nodeData} nodeActions={nodeActions} />;
};
