import { FunctionMath, Layers } from '@carbon/icons-react';
import {
  Button,
  Divider,
  Form,
  MenuToggle,
  MenuToggleElement,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
  Title,
} from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useMemo, useRef, useState } from 'react';

import {
  ForEachGroupItem,
  GROUPING_STRATEGY_LABELS,
  GroupingStrategy,
  ValueOfSelector,
  ValueOfType,
  ValueSelector,
} from '../../../../../models/datamapper/mapping';
import { DataMapperModal } from '../../../../DataMapper/DataMapperModal';
import { XPathEditorModal } from '../../../../XPath/XPathEditorModal';
import { TypeaheadInput, TypeaheadInputOption } from '../../TypeaheadInput';
import { SortKeySection } from '../Sort/SortKeySection';
import { useSortKeyEntries } from '../Sort/useSortKeyEntries';
import { useSortKeyItems } from '../Sort/useSortKeyItems';

interface ForEachGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: ForEachGroupItem;
  onUpdate: () => void;
}

export const ForEachGroupModal: FunctionComponent<ForEachGroupModalProps> = ({
  isOpen,
  onClose,
  mapping,
  onUpdate,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<GroupingStrategy>(mapping.groupingStrategy);
  const [groupingExpression, setGroupingExpression] = useState(mapping.groupingExpression);
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);

  const sortKeyItems = useSortKeyItems(mapping);
  const groupingOptions: TypeaheadInputOption[] = useMemo(
    () => sortKeyItems.map((opt) => ({ value: opt.xpath, description: opt.description })),
    [sortKeyItems],
  );

  const {
    entries: sortEntries,
    handleModalClose,
    handleAdd: handleAddSortKey,
    handleRemove: handleRemoveSortKey,
    handleChange: handleChangeSortKey,
    handleDrag,
    handleDrop,
    getSortItems,
  } = useSortKeyEntries(mapping.sortItems, onClose);

  const handleSave = useCallback(() => {
    mapping.groupingStrategy = selectedStrategy;
    mapping.groupingExpression = groupingExpression;
    mapping.sortItems = getSortItems();
    onUpdate();
    onClose();
  }, [selectedStrategy, groupingExpression, getSortItems, mapping, onUpdate, onClose]);

  const [isGroupingXPathEditorOpen, setIsGroupingXPathEditorOpen] = useState(false);
  const groupingXPathProxyRef = useRef<ValueSelector | null>(null);

  const handleOpenGroupingXPathEditor = useCallback(() => {
    const proxy = new ValueOfSelector(mapping, ValueOfType.VALUE);
    proxy.expression = groupingExpression;
    groupingXPathProxyRef.current = proxy;
    setIsGroupingXPathEditorOpen(true);
  }, [mapping, groupingExpression]);

  const handleGroupingXPathUpdate = useCallback(() => {
    if (!groupingXPathProxyRef.current) return;
    setGroupingExpression(groupingXPathProxyRef.current.expression);
  }, []);

  const handleGroupingXPathClose = useCallback(() => {
    groupingXPathProxyRef.current = null;
    setIsGroupingXPathEditorOpen(false);
  }, []);

  const strategyToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => {
          setIsStrategyOpen((prev) => !prev);
        }}
        isExpanded={isStrategyOpen}
        data-testid="for-each-group-strategy-toggle"
      >
        {GROUPING_STRATEGY_LABELS[selectedStrategy]}
      </MenuToggle>
    ),
    [isStrategyOpen, selectedStrategy],
  );

  const description = `for-each-group: ${mapping.expression}`;

  return (
    <DataMapperModal
      isOpen={isOpen}
      variant={ModalVariant.medium}
      onClose={handleModalClose}
      data-testid="for-each-group-modal"
      aria-label="For Each Group Configuration Modal"
    >
      <ModalHeader title="Configure for-each-group" titleIconVariant={Layers} description={description} />
      <ModalBody>
        <Form>
          <Title headingLevel="h4">Grouping</Title>
          <div className="sort-modal__row">
            <Select
              id="for-each-group-strategy"
              isOpen={isStrategyOpen}
              selected={selectedStrategy}
              onSelect={(_event, value) => {
                setSelectedStrategy(value as GroupingStrategy);
                setIsStrategyOpen(false);
              }}
              onOpenChange={setIsStrategyOpen}
              toggle={strategyToggle}
              data-testid="for-each-group-strategy"
            >
              <SelectList>
                {Object.values(GroupingStrategy).map((strategy) => (
                  <SelectOption key={strategy} value={strategy}>
                    {GROUPING_STRATEGY_LABELS[strategy]}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            <TypeaheadInput
              value={groupingExpression}
              onChange={setGroupingExpression}
              options={groupingOptions}
              id="for-each-group-expression"
              data-testid="for-each-group-expression"
              placeholder="Grouping XPath expression"
              ariaLabel="Grouping expression"
              className="sort-modal__expression"
            />
            <Button
              variant="plain"
              aria-label="Edit grouping expression"
              data-testid="for-each-group-edit-expression"
              title="Edit XPath"
              onClick={handleOpenGroupingXPathEditor}
              icon={<FunctionMath />}
            />
          </div>
          {isGroupingXPathEditorOpen && groupingXPathProxyRef.current && (
            <XPathEditorModal
              isOpen
              title="Grouping expression"
              mapping={groupingXPathProxyRef.current}
              onClose={handleGroupingXPathClose}
              onUpdate={handleGroupingXPathUpdate}
            />
          )}
          <Divider />
          <Title headingLevel="h4">Sort keys</Title>
          <SortKeySection
            entries={sortEntries}
            mapping={mapping}
            onAdd={handleAddSortKey}
            onChange={handleChangeSortKey}
            onRemove={handleRemoveSortKey}
            onDrag={handleDrag}
            onDrop={handleDrop}
            hideWhenEmpty
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          key="save"
          variant="primary"
          onClick={handleSave}
          isDisabled={!groupingExpression.trim()}
          data-testid="for-each-group-save-btn"
        >
          Save
        </Button>
        <Button key="cancel" variant="link" onClick={onClose} data-testid="for-each-group-cancel-btn">
          Cancel
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
};
