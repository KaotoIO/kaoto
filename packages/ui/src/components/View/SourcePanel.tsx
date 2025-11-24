import { Title } from '@patternfly/react-core';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { DocumentContent, DocumentHeader } from '../Document/BaseDocument';
import { ParametersSection } from '../Document/Parameters';
import { SourceDocumentNode } from '../Document/SourceDocumentNode';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import './SourcePanel.scss';

type SourcePanelProps = {
  isReadOnly?: boolean;
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false }) => {
  const { sourceBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  // Create tree for source body
  const sourceBodyNodeData = useMemo(() => new DocumentNodeData(sourceBodyDocument), [sourceBodyDocument]);
  const [sourceBodyTree, setSourceBodyTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setSourceBodyTree(TreeUIService.createTree(sourceBodyNodeData));
  }, [sourceBodyNodeData]);

  return (
    <div id="panel-source" className="source-panel">
      <ExpansionPanels>
        {/* Parameters section - self-contained component that manages all parameter state */}
        <ParametersSection isReadOnly={isReadOnly} onScroll={reloadNodeReferences} />

        {/* Source Body - composed directly, no wrapper */}
        {sourceBodyTree && (
          <ExpansionPanel
            id="source-body"
            key="source-body"
            defaultExpanded={true}
            defaultHeight={300}
            minHeight={100}
            summary={
              <DocumentHeader
                header={<Title headingLevel="h5">Body</Title>}
                document={sourceBodyDocument}
                documentType={DocumentType.SOURCE_BODY}
                isReadOnly={isReadOnly}
                enableDnD={false}
                additionalActions={[]}
              />
            }
            onScroll={reloadNodeReferences}
          >
            <DocumentContent
              treeNode={sourceBodyTree.root}
              documentId={sourceBodyNodeData.id}
              isReadOnly={isReadOnly}
              renderNodes={(childNode, readOnly) => (
                <SourceDocumentNode
                  treeNode={childNode}
                  documentId={sourceBodyNodeData.id}
                  isReadOnly={readOnly}
                  rank={1}
                />
              )}
            />
          </ExpansionPanel>
        )}
      </ExpansionPanels>
    </div>
  );
};
