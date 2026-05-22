import './AbstractConfigModal.scss';

import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  SearchInput,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { MockAbstractNode, MockFieldNode } from './mockAbstractData';

interface AddFieldCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (candidateId: string) => void;
  abstractNode: MockAbstractNode;
}

export const AddFieldCandidateModal: FunctionComponent<AddFieldCandidateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  abstractNode,
}) => {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');

  const showSearch = abstractNode.candidates.length > 10;

  const filteredCandidates = useMemo(() => {
    if (!searchFilter) return abstractNode.candidates;
    const lower = searchFilter.toLowerCase();
    return abstractNode.candidates.filter((c) => c.displayName.toLowerCase().includes(lower));
  }, [abstractNode.candidates, searchFilter]);

  const handleConfirm = useCallback(() => {
    if (selected) {
      onConfirm(selected);
      setSelected(undefined);
      setSearchFilter('');
    }
  }, [selected, onConfirm]);

  const handleClose = useCallback(() => {
    setSelected(undefined);
    setSearchFilter('');
    onClose();
  }, [onClose]);

  const renderCandidate = (candidate: MockFieldNode) => {
    const childrenPreview = candidate.children
      ? candidate.children.map((c) => ('displayName' in c ? c.displayName : '')).join(', ')
      : undefined;

    const label = (
      <div className="abstract-config-modal__candidate-label">
        <span className="abstract-config-modal__candidate-name">{candidate.displayName}</span>
        <span className="abstract-config-modal__candidate-type">{candidate.type}</span>
      </div>
    );

    return (
      <div key={candidate.id} className="abstract-config-modal__candidate-item">
        <Radio
          isChecked={selected === candidate.id}
          name="add-field-candidate"
          onChange={() => setSelected(candidate.id)}
          label={label}
          id={`add-field-radio-${candidate.id}`}
        />
        {candidate.description && (
          <div className="abstract-config-modal__candidate-description">{candidate.description}</div>
        )}
        {childrenPreview && <div className="abstract-config-modal__candidate-children">Fields: {childrenPreview}</div>}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={handleClose} ouiaId="AddFieldCandidateModal">
      <ModalHeader
        title="Add Field"
        description={`Choose a concrete element to add under ${abstractNode.elementName}`}
      />
      <ModalBody>
        {showSearch && (
          <div className="abstract-config-modal__search">
            <SearchInput
              placeholder="Filter candidates..."
              value={searchFilter}
              onChange={(_event, value) => setSearchFilter(value)}
              onClear={() => setSearchFilter('')}
            />
          </div>
        )}
        <div className="abstract-config-modal__candidate-list">
          {filteredCandidates.map(renderCandidate)}
          {filteredCandidates.length === 0 && (
            <p className="abstract-config-modal__no-results">No candidates match the filter.</p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button key="confirm" variant="primary" onClick={handleConfirm} isDisabled={!selected}>
          Confirm
        </Button>
        <Button key="cancel" variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
