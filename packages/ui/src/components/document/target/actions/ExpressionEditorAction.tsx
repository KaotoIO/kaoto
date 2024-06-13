import { NodeData } from '../../../../models/visualization';
import { ExpressionItem } from '../../../../models/mapping';
import { FunctionComponent, MouseEvent, useCallback, useState } from 'react';
import { ActionListGroup, ActionListItem, Button, Modal, ModalVariant } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { ExpressionEditor } from '../../../expression/ExpressionEditor';

type ExpressionEditorProps = {
  nodeData: NodeData;
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const ExpressionEditorAction: FunctionComponent<ExpressionEditorProps> = ({ nodeData, mapping, onUpdate }) => {
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const launchExpressionEditor = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setIsEditorOpen(true);
    event.stopPropagation();
  }, []);
  const closeExpressionEditor = useCallback(() => {
    setIsEditorOpen(false);
  }, []);

  return (
    <ActionListGroup key="expression-editor">
      <ActionListItem>
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
      </ActionListItem>
      <Modal
        className="expression-editor-modal"
        position="top"
        title={`Expression Editor: ${nodeData.title}`}
        variant={ModalVariant.large}
        isOpen={isEditorOpen}
        onClose={closeExpressionEditor}
        actions={[
          <Button key="close-expression-editor" onClick={closeExpressionEditor}>
            Close
          </Button>,
        ]}
      >
        <ExpressionEditor mapping={mapping} onUpdate={onUpdate} />
      </Modal>
    </ActionListGroup>
  );
};
