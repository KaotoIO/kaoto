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
  Title,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { IMemberSelection, IWrapperCandidate } from '../../../../models/datamapper/field-action';
import { DataMapperModal } from '../../../DataMapper/DataMapperModal';
import { ResizableSplitPanels } from '../../../ResizableSplitPanels';

const SEARCH_THRESHOLD = 10;

export interface WrapperSelectionModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  testId: string;
  candidates: IWrapperCandidate[];
  selectedKey: string | null;
  onSelect: (selection: IMemberSelection) => void;
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

  const selectedCandidate = useMemo(() => candidates.find((c) => c.key === selected), [candidates, selected]);

  const handleConfirm = useCallback(() => {
    if (selectedCandidate) {
      onSelect(selectedCandidate.selection);
      setSelected(undefined);
      setSearchFilter('');
      onClose();
    }
  }, [selectedCandidate, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelected(undefined);
    setSearchFilter('');
    onClose();
  }, [onClose]);

  return (
    <DataMapperModal variant={ModalVariant.large} isOpen={isOpen} onClose={handleClose} appendTo={() => document.body}>
      <ModalHeader title={title} description={description} />
      <ModalBody>
        <div className="wrapper-selection-modal__body">
          <ResizableSplitPanels
            defaultLeftWidth={45}
            leftPanelId={`${testId}-candidates-panel`}
            rightPanelId={`${testId}-details-panel`}
            leftPanelLabel="Candidates"
            rightPanelLabel="Candidate details"
            leftPanel={
              <div className="wrapper-selection-modal__pane wrapper-selection-modal__pane--list">
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
                    <div
                      key={candidate.key}
                      className="wrapper-selection-modal__candidate-item"
                      data-selected={selected === candidate.key || undefined}
                    >
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
                    </div>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <p className="wrapper-selection-modal__no-results">
                      {searchFilter ? 'No candidates match the filter.' : 'No candidates available.'}
                    </p>
                  )}
                </div>
              </div>
            }
            rightPanel={
              <div className="wrapper-selection-modal__pane" aria-live="polite" data-testid={`${testId}-details`}>
                <CandidateDetails candidate={selectedCandidate} />
              </div>
            }
          />
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

const CandidateDetails: FunctionComponent<{ candidate?: IWrapperCandidate }> = ({ candidate }) => {
  if (!candidate) {
    return <p className="wrapper-selection-modal__details-empty">Select a candidate to see its details.</p>;
  }

  const children = candidate.children ?? [];
  const hasChildren = children.length > 0;

  return (
    <div className="wrapper-selection-modal__details">
      <div className="wrapper-selection-modal__details-header">
        <Title headingLevel="h3" size="md">
          {candidate.label}
        </Title>
        <Label isCompact>{candidate.typeLabel ?? candidate.typeBadge}</Label>
      </div>
      {candidate.description && <p className="wrapper-selection-modal__details-description">{candidate.description}</p>}
      {hasChildren && (
        <>
          <Title headingLevel="h4" size="md" className="wrapper-selection-modal__details-section">
            Fields
          </Title>
          <ul className="wrapper-selection-modal__details-fields" aria-label={`Fields of ${candidate.label}`}>
            {children.map((child, index) => (
              <li key={`${index}-${child.name}`} className="wrapper-selection-modal__details-field">
                <span>{child.name}</span>
                <Label isCompact>{child.typeLabel}</Label>
              </li>
            ))}
          </ul>
        </>
      )}
      {!candidate.description && !hasChildren && (
        <p className="wrapper-selection-modal__details-empty">No additional details available.</p>
      )}
    </div>
  );
};
