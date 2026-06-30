import './AbstractConfigModal.scss';

import {
  Button,
  Checkbox,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  SearchInput,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { AbstractConfig, MockAbstractNode, MockFieldNode } from './mockAbstractData';

interface AbstractConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: AbstractConfig) => void;
  abstractNode: MockAbstractNode;
  'data-testid'?: string;
}

interface CandidateItemProps {
  candidate: MockFieldNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  selectionType: 'radio' | 'checkbox';
}

const CandidateItem: FunctionComponent<CandidateItemProps> = ({ candidate, isSelected, onSelect, selectionType }) => {
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
    <div className="abstract-config-modal__candidate-item" data-testid={`candidate-${candidate.id}`}>
      {selectionType === 'radio' ? (
        <Radio
          isChecked={isSelected}
          name="candidate-selection"
          onChange={() => {
            onSelect(candidate.id);
          }}
          label={label}
          id={`radio-${candidate.id}`}
          data-testid={`radio-${candidate.id}`}
        />
      ) : (
        <Checkbox
          isChecked={isSelected}
          onChange={() => {
            onSelect(candidate.id);
          }}
          label={label}
          id={`checkbox-${candidate.id}`}
          data-testid={`checkbox-${candidate.id}`}
        />
      )}
      {candidate.description && (
        <div className="abstract-config-modal__candidate-description">{candidate.description}</div>
      )}
      {childrenPreview && <div className="abstract-config-modal__candidate-children">Fields: {childrenPreview}</div>}
    </div>
  );
};

export const AbstractConfigModal: FunctionComponent<AbstractConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  abstractNode,
  'data-testid': dataTestId = 'abstract-config-modal',
}) => {
  const [selectedSingle, setSelectedSingle] = useState<string | undefined>(undefined);
  const [selectedMultiple, setSelectedMultiple] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  const isCollection = abstractNode.maxOccurs === -1 || abstractNode.maxOccurs > 1;
  const useRadio = !isCollection;
  const showSearch = abstractNode.candidates.length > 10;

  const filteredCandidates = useMemo(() => {
    if (!searchFilter) return abstractNode.candidates;
    const lower = searchFilter.toLowerCase();
    return abstractNode.candidates.filter((c) => c.displayName.toLowerCase().includes(lower));
  }, [abstractNode.candidates, searchFilter]);

  const handleSingleSelect = useCallback((id: string) => {
    setSelectedSingle(id);
  }, []);

  const handleMultipleToggle = useCallback((id: string) => {
    setSelectedMultiple((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const allFilteredSelected = useMemo(
    () => filteredCandidates.length > 0 && filteredCandidates.every((c) => selectedMultiple.has(c.id)),
    [filteredCandidates, selectedMultiple],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedMultiple((prev) => {
      const newSet = new Set(prev);
      if (allFilteredSelected) {
        for (const c of filteredCandidates) {
          newSet.delete(c.id);
        }
      } else {
        for (const c of filteredCandidates) {
          newSet.add(c.id);
        }
      }
      return newSet;
    });
  }, [allFilteredSelected, filteredCandidates]);

  const handleConfirm = useCallback(() => {
    if (useRadio && selectedSingle) {
      onConfirm({ mode: 'static', selectedCandidateIds: [selectedSingle] });
    } else if (!useRadio && selectedMultiple.size >= 1) {
      onConfirm({ mode: 'static', selectedCandidateIds: Array.from(selectedMultiple) });
    }
  }, [useRadio, selectedSingle, selectedMultiple, onConfirm]);

  const handleClose = useCallback(() => {
    setSelectedSingle(undefined);
    setSelectedMultiple(new Set());
    setSearchFilter('');
    onClose();
  }, [onClose]);

  const isConfirmDisabled = useRadio ? !selectedSingle : selectedMultiple.size < 1;

  const title = isCollection ? 'Add Field(s)' : 'Add Field';
  const description = isCollection
    ? `Choose one or more concrete elements to place under ${abstractNode.elementName}`
    : `Choose a concrete element to replace ${abstractNode.elementName}`;

  return (
    <Modal
      isOpen={isOpen}
      variant={ModalVariant.medium}
      onClose={handleClose}
      data-testid={dataTestId}
      ouiaId="AbstractConfigModal"
    >
      <ModalHeader title={title} description={description} />
      <ModalBody>
        {showSearch && (
          <div className="abstract-config-modal__search">
            <SearchInput
              placeholder="Filter candidates..."
              value={searchFilter}
              onChange={(_event, value) => {
                setSearchFilter(value);
              }}
              onClear={() => {
                setSearchFilter('');
              }}
              data-testid={`${dataTestId}-search`}
            />
          </div>
        )}
        {!useRadio && (
          <div className="abstract-config-modal__select-all">
            <Checkbox
              isChecked={allFilteredSelected}
              onChange={handleSelectAll}
              label={showSearch && searchFilter ? `Select all matching (${filteredCandidates.length})` : 'Select all'}
              id="select-all"
              data-testid={`${dataTestId}-select-all`}
            />
          </div>
        )}
        <div className="abstract-config-modal__candidate-list">
          {filteredCandidates.map((candidate) => (
            <CandidateItem
              key={candidate.id}
              candidate={candidate}
              isSelected={useRadio ? selectedSingle === candidate.id : selectedMultiple.has(candidate.id)}
              onSelect={useRadio ? handleSingleSelect : handleMultipleToggle}
              selectionType={useRadio ? 'radio' : 'checkbox'}
            />
          ))}
          {filteredCandidates.length === 0 && (
            <p className="abstract-config-modal__no-results">No candidates match the filter.</p>
          )}
        </div>
        {!useRadio && (
          <HelperText>
            <HelperTextItem variant={selectedMultiple.size < 1 ? 'warning' : 'default'}>
              Select at least 1 candidate ({selectedMultiple.size} selected)
            </HelperTextItem>
          </HelperText>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          key="confirm"
          variant="primary"
          onClick={handleConfirm}
          isDisabled={isConfirmDisabled}
          data-testid={`${dataTestId}-confirm-btn`}
        >
          Confirm
        </Button>
        <Button key="cancel" variant="link" onClick={handleClose} data-testid={`${dataTestId}-cancel-btn`}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
