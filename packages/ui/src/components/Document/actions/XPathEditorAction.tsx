import { ActionListItem, Button } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useState } from 'react';

import { useCanvas } from '../../../hooks/useCanvas';
import { ExpressionItem } from '../../../models/datamapper/mapping';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { XPathEditorModal } from '../../XPath/XPathEditorModal';

type XPathEditorProps = {
  nodeData: TargetNodeData;
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const XPathEditorAction: FunctionComponent<XPathEditorProps> = ({ nodeData, mapping, onUpdate }) => {
  const { reloadNodeReferences } = useCanvas();
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const launchXPathEditor = useCallback(() => setIsEditorOpen(true), []);
  const closeXPathEditor = useCallback(() => {
    setIsEditorOpen(false);
    reloadNodeReferences();
  }, [reloadNodeReferences]);

  return (
    <ActionListItem key="xpath-editor">
      <Button
        variant="plain"
        title="Edit XPath"
        aria-label="Edit XPath"
        data-testid={`edit-xpath-button-${nodeData.id}`}
        onClick={launchXPathEditor}
        className="document-field__button"
        icon={<PencilAltIcon />}
      />
      <XPathEditorModal
        title={nodeData.title}
        isOpen={isEditorOpen}
        onClose={closeXPathEditor}
        mapping={mapping}
        onUpdate={onUpdate}
      />
    </ActionListItem>
  );
};
