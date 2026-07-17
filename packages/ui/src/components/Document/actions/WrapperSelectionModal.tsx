import './WrapperSelectionModal.scss';

import {
  Button,
  Label,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  SearchInput,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { MemberSelection, WrapperCandidate } from '../../../services/visualization/wrapper-action.service';
import { DataMapperModal } from '../../DataMapper/DataMapperModal';

const SEARCH_THRESHOLD = 10;

export interface WrapperSelectionModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  testId: string;
  candidates: WrapperCandidate[];
  selectedKey: string | null;
  onSelect: (selection: MemberSelection) => void;
  onClose: () => void;
}

/**
 * Unified candidate selector modal for both abstract and choice wrapper fields.
 * Labels adapt via props: abstract uses "Select substitute", choice uses "Select member".
 * Candidates are pre-dissolved by the caller — dissolution logic lives in {@link dissolveChoiceMembers}
 * and {@link buildAbstractCandidates} in `menu-utils.ts`.
 */
export const WrapperSelectionModal: FunctionComponent<WrapperSelectionModalProps> = ({
  isOpen,
  title,
  description,
  testId,
  candidates,
  selectedKey,
  onSelect,
  onClose,
}) => {
  const [selected, setSelected] = useState<string | undefined>(selectedKey ?? undefined);
  const [searchFilter, setSearchFilter] = useState('');

  const showSearch = candidates.length > SEARCH_THRESHOLD;

  const filteredCandidates = useMemo(() => {
    if (!searchFilter) return candidates;
    const lower = searchFilter.toLowerCase();
    return candidates.filter((c) => c.label.toLowerCase().includes(lower));
  }, [candidates, searchFilter]);

  const handleConfirm = useCallback(() => {
    const candidate = candidates.find((c) => c.key === selected);
    if (candidate) {
      onSelect(candidate.selection);
      setSelected(undefined);
      setSearchFilter('');
      onClose();
    }
  }, [selected, candidates, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelected(undefined);
    setSearchFilter('');
    onClose();
  }, [onClose]);

  return (
    <DataMapperModal variant={ModalVariant.medium} isOpen={isOpen} onClose={handleClose} appendTo={() => document.body}>
      <ModalHeader title={title} description={description} />
      <ModalBody>
        {showSearch && (
          <div className="wrapper-selection-modal__search">
            <SearchInput
              aria-label="Filter candidates"
              placeholder="Filter candidates..."
              value={searchFilter}
              onChange={(_event, value) => {
                setSearchFilter(value);
              }}
              onClear={() => {
                setSearchFilter('');
              }}
              data-testid={`${testId}-search`}
            />
          </div>
        )}
        <div className="wrapper-selection-modal__candidate-list" data-testid={testId}>
          {filteredCandidates.map((candidate) => (
            <div key={candidate.key} className="wrapper-selection-modal__candidate-item">
              <Radio
                isChecked={selected === candidate.key}
                name="wrapper-selection"
                onChange={() => {
                  setSelected(candidate.key);
                }}
                label={
                  <div className="wrapper-selection-modal__candidate-label">
                    <span className="wrapper-selection-modal__candidate-name">{candidate.label}</span>
                    <Label isCompact>{candidate.typeBadge}</Label>
                  </div>
                }
                id={`wrapper-radio-${candidate.key}`}
                data-testid={`wrapper-radio-${candidate.key}`}
              />
              {candidate.description && (
                <div className="wrapper-selection-modal__candidate-description">{candidate.description}</div>
              )}
              {candidate.childrenPreview && candidate.childrenPreview.length > 0 && (
                <div className="wrapper-selection-modal__candidate-children">
                  Fields: {candidate.childrenPreview.join(', ')}
                </div>
              )}
            </div>
          ))}
          {filteredCandidates.length === 0 && (
            <p className="wrapper-selection-modal__no-results">
              {searchFilter ? 'No candidates match the filter.' : 'No candidates available.'}
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="link" onClick={handleClose}>
          Cancel
        </Button>
        <Button key="confirm" variant="primary" onClick={handleConfirm} isDisabled={!selected}>
          Confirm
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
};
