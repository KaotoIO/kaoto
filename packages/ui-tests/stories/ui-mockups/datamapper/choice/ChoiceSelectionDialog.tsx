import './ChoiceSelectionDialog.scss';

import { Types } from '@kaoto/kaoto/testing';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant, Radio } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';

import { isChoiceNode, MockChoiceNode, MockTreeNode } from './mockSchemaData';

interface ChoiceSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedId: string) => void;
  choiceNode: MockChoiceNode;
  currentSelection?: string;
  'data-testid'?: string;
}

interface OptionItemProps {
  member: MockTreeNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const OptionItem: FunctionComponent<OptionItemProps> = ({ member, isSelected, onSelect }) => {
  const displayName = isChoiceNode(member) ? member.title : member.displayName;
  const displayType = isChoiceNode(member) ? 'Choice' : member.type;
  const description = isChoiceNode(member) ? `Nested choice with ${member.members.length} options` : member.description;

  return (
    <div className="choice-option" data-testid={`option-${member.id}`}>
      <Radio
        isChecked={isSelected}
        name="choice-selection"
        onChange={() => onSelect(member.id)}
        label={
          <div className="choice-option__label">
            <span className="choice-option__name">{displayName}</span>
            <span className="choice-option__type">{displayType}</span>
          </div>
        }
        id={`radio-${member.id}`}
        data-testid={`radio-${member.id}`}
      />
      {description && <div className="choice-option__description">{description}</div>}
    </div>
  );
};

export const ChoiceSelectionDialog: FunctionComponent<ChoiceSelectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  choiceNode,
  currentSelection,
  'data-testid': dataTestId = 'choice-selection-dialog',
}) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(currentSelection);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedId) {
      onConfirm(selectedId);
    }
  }, [selectedId, onConfirm]);

  const handleClose = useCallback(() => {
    setSelectedId(currentSelection);
    onClose();
  }, [currentSelection, onClose]);

  const memberNames = choiceNode.members.map((m) => (isChoiceNode(m) ? m.title : m.displayName)).join(' | ');

  return (
    <Modal
      isOpen={isOpen}
      variant={ModalVariant.small}
      onClose={handleClose}
      data-testid={dataTestId}
      ouiaId="ChoiceSelectionDialog"
    >
      <ModalHeader title="Select Choice Option" description={`Choose one of: ${memberNames}`} />

      <ModalBody>
        <div className="choice-options">
          {choiceNode.members.map((member) => (
            <OptionItem key={member.id} member={member} isSelected={selectedId === member.id} onSelect={handleSelect} />
          ))}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          key="select"
          variant="primary"
          onClick={handleConfirm}
          isDisabled={!selectedId}
          data-testid={`${dataTestId}-select-btn`}
        >
          Select
        </Button>
        <Button key="cancel" variant="link" onClick={handleClose} data-testid={`${dataTestId}-cancel-btn`}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
