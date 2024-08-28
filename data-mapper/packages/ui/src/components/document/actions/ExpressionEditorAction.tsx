import { TargetNodeData } from '../../../models/visualization';
import { ExpressionItem } from '../../../models/mapping';
import { FunctionComponent, useCallback, useState } from 'react';
import { ActionListItem, Button, Modal, ModalVariant } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { ExpressionEditor } from '../../expression/ExpressionEditor';

type ExpressionEditorProps = {
  nodeData: TargetNodeData;
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const ExpressionEditorAction: FunctionComponent<ExpressionEditorProps> = ({ nodeData, mapping, onUpdate }) => {
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const launchExpressionEditor = useCallback(() => setIsEditorOpen(true), []);
  const closeExpressionEditor = useCallback(() => setIsEditorOpen(false), []);

  return (
    <ActionListItem key="expression-editor">
      <Button
        size="sm"
        variant="plain"
        component="small"
        aria-label="Expression Editor"
        data-testid={`edit-expression-button-${nodeData.id}`}
        onClick={launchExpressionEditor}
        className="document-field__button"
        icon={<PencilAltIcon />}
      />
      <Modal
        className="expression-editor-modal"
        position="top"
        title={`Expression Editor: ${nodeData.title}`}
        variant={ModalVariant.large}
        isOpen={isEditorOpen}
        onClose={closeExpressionEditor}
        data-testid="expression-editor-modal"
        actions={[
          <Button
            key="close-expression-editor"
            onClick={closeExpressionEditor}
            data-testid="close-expression-editor-btn"
          >
            Close
          </Button>,
        ]}
      >
        <ExpressionEditor mapping={mapping} onUpdate={onUpdate} />
      </Modal>
    </ActionListItem>
  );
};
