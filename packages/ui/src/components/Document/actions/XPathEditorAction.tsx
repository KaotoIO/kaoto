import { TargetNodeData } from '../../../models/datamapper/visualization';
import { ExpressionItem } from '../../../models/datamapper/mapping';
import { FunctionComponent, useCallback, useState } from 'react';
import { ActionListItem, Button } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { XPathEditorModal } from '../../XPath/XPathEditorModal';

type XPathEditorProps = {
  nodeData: TargetNodeData;
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const XPathEditorAction: FunctionComponent<XPathEditorProps> = ({ nodeData, mapping, onUpdate }) => {
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const launchXPathEditor = useCallback(() => setIsEditorOpen(true), []);
  const closeXPathEditor = useCallback(() => setIsEditorOpen(false), []);

  return (
    <ActionListItem key="xpath-editor">
      <Button
        size="sm"
        variant="plain"
        component="small"
        aria-label="XPath Editor"
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
