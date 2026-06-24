import './SortModal.scss';

import { Button, Form, ModalBody, ModalFooter, ModalHeader, ModalVariant, Title } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { ForEachGroupItem, ForEachItem, SortItem } from '../../../../../models/datamapper/mapping';
import { DataMapperModal } from '../../../../DataMapper/DataMapperModal';
import { SortKeySection } from './SortKeySection';
import { useSortKeyEntries } from './useSortKeyEntries';

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: ForEachItem | ForEachGroupItem;
  onUpdate: () => void;
}

export const SortModal: FunctionComponent<SortModalProps> = ({ isOpen, onClose, mapping, onUpdate }) => {
  const { entries, handleModalClose, handleAdd, handleRemove, handleChange, handleDrag, handleDrop, getSortItems } =
    useSortKeyEntries(mapping.sortItems, onClose, [new SortItem()]);

  const handleSave = useCallback(() => {
    mapping.sortItems = getSortItems();
    onUpdate();
    onClose();
  }, [getSortItems, mapping, onUpdate, onClose]);

  const description = `${mapping instanceof ForEachItem ? 'for-each' : 'for-each-group'}: ${mapping.expression}`;

  return (
    <DataMapperModal
      isOpen={isOpen}
      variant={ModalVariant.medium}
      onClose={handleModalClose}
      data-testid="sort-modal"
      aria-label="Sort Configuration Modal"
    >
      <ModalHeader title="Configure Sort" titleIconVariant={LayerGroupIcon} description={description} />
      <ModalBody>
        <Form>
          <Title headingLevel="h4">Sort keys</Title>
          <SortKeySection
            entries={entries}
            mapping={mapping}
            onAdd={handleAdd}
            onChange={handleChange}
            onRemove={handleRemove}
            onDrag={handleDrag}
            onDrop={handleDrop}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button key="save" variant="primary" onClick={handleSave} data-testid="sort-save-btn">
          Save
        </Button>
        <Button key="cancel" variant="link" onClick={onClose} data-testid="sort-cancel-btn">
          Cancel
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
};
