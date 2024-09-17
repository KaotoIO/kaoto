import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { XPathEditorLayout } from './XPathEditorLayout';
import { ExpressionItem } from '../../models/datamapper';
import './XPathEditorModal.scss';

type XPathEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mapping: ExpressionItem;
  onUpdate: () => void;
};

export const XPathEditorModal: FunctionComponent<XPathEditorModalProps> = ({
  isOpen,
  onClose,
  title,
  mapping,
  onUpdate,
}) => {
  return (
    <Modal
      className="xpath-editor-modal"
      position="top"
      title={`XPath Editor: ${title}`}
      variant={ModalVariant.large}
      width="90%"
      isOpen={isOpen}
      onClose={onClose}
      data-testid="xpath-editor-modal"
      actions={[
        <Button key="close-xpath-editor" onClick={onClose} data-testid="close-xpath-editor-btn">
          Close
        </Button>,
      ]}
    >
      <XPathEditorLayout mapping={mapping} onUpdate={onUpdate} />
    </Modal>
  );
};
