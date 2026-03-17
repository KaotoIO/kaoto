import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Form,
  FormGroup,
  Icon,
  InputGroup,
  InputGroupItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  TextInput,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVIcon,
  LayerGroupIcon,
  PencilAltIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import { CSSProperties, FunctionComponent, MouseEvent, ReactNode, Ref, useEffect, useState } from 'react';

export type GroupingStrategy = 'group-by' | 'group-adjacent' | 'group-starting-with' | 'group-ending-with';

export const STRATEGY_LABELS: Record<GroupingStrategy, string> = {
  'group-by': 'Group By',
  'group-adjacent': 'Group Adjacent',
  'group-starting-with': 'Group Starting With',
  'group-ending-with': 'Group Ending With',
};

const STRATEGIES = Object.keys(STRATEGY_LABELS) as GroupingStrategy[];

const ROW_BASE: CSSProperties = {
  display: 'flex',
  flexFlow: 'row nowrap',
  alignItems: 'center',
  height: '2rem',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
};

const ICON_SPACER: CSSProperties = {
  margin: '0 0.25rem',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
};

const INPUT_HEIGHT = '1.75rem';

const rowStyle = (rank: number, isLeaf: boolean): CSSProperties => ({
  ...ROW_BASE,
  marginLeft: `${rank * 1.2}rem`,
  ...(isLeaf
    ? {
        color: 'var(--pf-t--global--color--text--subtle)',
        borderLeft: '1px dotted gray',
        paddingLeft: '0.5rem',
      }
    : {}),
});

interface MockTreeRowProps {
  rank: number;
  title: ReactNode;
  isExpandable?: boolean;
  isExpanded?: boolean;
  isCollection?: boolean;
  actions?: ReactNode;
  onToggle?: () => void;
}

const MockTreeRow: FunctionComponent<MockTreeRowProps> = ({
  rank,
  title,
  isExpandable = false,
  isExpanded = false,
  isCollection = false,
  actions,
  onToggle,
}) => {
  return (
    <section style={rowStyle(rank, !isExpandable)}>
      {isExpandable ? (
        <Icon style={ICON_SPACER} onClick={onToggle}>
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Icon>
      ) : (
        <span style={{ width: '1.25rem', flexShrink: 0 }} />
      )}
      {title}
      {isCollection && (
        <Icon style={ICON_SPACER}>
          <LayerGroupIcon />
        </Icon>
      )}
      {actions && (
        <ActionList style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <ActionListGroup>{actions}</ActionListGroup>
        </ActionList>
      )}
    </section>
  );
};

interface MockExpressionInputProps {
  value: string;
  placeholder?: string;
}

const MockExpressionInput: FunctionComponent<MockExpressionInputProps> = ({
  value,
  placeholder = 'XPath expression',
}) => (
  <>
    <ActionListItem style={{ flex: 1 }}>
      <TextInput
        value={value}
        onChange={() => {}}
        placeholder={placeholder}
        style={{ fontSize: '0.875rem', height: INPUT_HEIGHT, minWidth: '100px' }}
        aria-label="XPath expression"
      />
    </ActionListItem>
    <ActionListItem>
      <Button
        variant="plain"
        aria-label="Edit XPath"
        style={{ height: INPUT_HEIGHT, padding: '0 0.25rem' }}
        icon={<PencilAltIcon />}
      />
    </ActionListItem>
  </>
);

const MockTrashButton: FunctionComponent<{ ariaLabel: string }> = ({ ariaLabel }) => (
  <ActionListItem>
    <Button
      variant="plain"
      aria-label={ariaLabel}
      style={{ height: INPUT_HEIGHT, padding: '0 0.25rem' }}
      icon={<TrashIcon />}
    />
  </ActionListItem>
);

interface MockGroupingModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: GroupingStrategy;
  expression: string;
}

const MockGroupingModal: FunctionComponent<MockGroupingModalProps> = ({ isOpen, onClose, strategy, expression }) => {
  const [selectedStrategy, setSelectedStrategy] = useState<GroupingStrategy>(strategy);

  return (
    <Modal variant={ModalVariant.small} isOpen={isOpen} onClose={onClose} aria-labelledby="grouping-modal-title">
      <ModalHeader title="Configure for-each-group" labelId="grouping-modal-title" />
      <ModalBody>
        <Form>
          <FormGroup label="Grouping strategy" isRequired fieldId="grouping-strategy">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.25rem' }}>
              {STRATEGIES.map((s) => (
                <Radio
                  key={s}
                  id={`strategy-${s}`}
                  name="grouping-strategy"
                  label={STRATEGY_LABELS[s]}
                  value={s}
                  isChecked={selectedStrategy === s}
                  onChange={() => setSelectedStrategy(s)}
                />
              ))}
            </div>
          </FormGroup>
          <FormGroup label="Grouping expression" isRequired fieldId="grouping-expression">
            <InputGroup>
              <InputGroupItem isFill>
                <TextInput
                  id="grouping-expression"
                  value={expression}
                  onChange={() => {}}
                  placeholder="XPath expression"
                  aria-label="Grouping expression"
                />
              </InputGroupItem>
              <InputGroupItem>
                <Button variant="plain" aria-label="Edit grouping expression" icon={<PencilAltIcon />} />
              </InputGroupItem>
            </InputGroup>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button key="save" variant="primary" onClick={onClose}>
          Save
        </Button>
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

interface MockCollectionFieldMenuProps {
  initialOpen?: boolean;
  onWrapWithForEachGroup?: () => void;
}

const MockCollectionFieldMenu: FunctionComponent<MockCollectionFieldMenuProps> = ({
  initialOpen = false,
  onWrapWithForEachGroup,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (initialOpen) setIsOpen(true);
  }, [initialOpen]);

  const handleSelect = (_e: MouseEvent | undefined, value: string | number | undefined) => {
    if (value === 'foreach-group') {
      onWrapWithForEachGroup?.();
    }
    setIsOpen(false);
  };

  return (
    <ActionListItem>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(open) => setIsOpen(open)}
        onSelect={handleSelect}
        toggle={(toggleRef: Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            icon={<EllipsisVIcon />}
            variant="plain"
            onClick={(_e: MouseEvent) => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            aria-label="Transformation Action list"
            style={{ height: INPUT_HEIGHT, padding: '0 0.25rem' }}
          />
        )}
        popperProps={{ position: 'end', preventOverflow: true }}
        zIndex={100}
      >
        <DropdownList>
          <DropdownItem key="foreach" value="foreach">
            Wrap with <q>for-each</q>
          </DropdownItem>
          <DropdownItem key="foreach-group" value="foreach-group" style={{ fontWeight: 'bold' }}>
            Wrap with <q>for-each-group</q>
          </DropdownItem>
          <DropdownItem key="if" value="if">
            Wrap with <q>if</q>
          </DropdownItem>
          <DropdownItem key="choose" value="choose">
            Wrap with <q>choose-when-otherwise</q>
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </ActionListItem>
  );
};

interface MockInnerCollectionFieldMenuProps {
  initialOpen?: boolean;
}

const MockInnerCollectionFieldMenu: FunctionComponent<MockInnerCollectionFieldMenuProps> = ({
  initialOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (initialOpen) setIsOpen(true);
  }, [initialOpen]);

  return (
    <ActionListItem>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(open) => setIsOpen(open)}
        onSelect={() => setIsOpen(false)}
        toggle={(toggleRef: Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            icon={<EllipsisVIcon />}
            variant="plain"
            onClick={(_e: MouseEvent) => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            aria-label="Transformation Action list"
            style={{ height: INPUT_HEIGHT, padding: '0 0.25rem' }}
          />
        )}
        popperProps={{ position: 'end', preventOverflow: true }}
        zIndex={100}
      >
        <DropdownList>
          <DropdownItem key="foreach" value="foreach">
            Wrap with <q>for-each</q>
          </DropdownItem>
          <DropdownItem key="foreach-current-group" value="foreach-current-group" style={{ fontWeight: 'bold' }}>
            Wrap with <q>for-each current-group()</q>
          </DropdownItem>
          <DropdownItem key="if" value="if">
            Wrap with <q>if</q>
          </DropdownItem>
          <DropdownItem key="choose" value="choose">
            Wrap with <q>choose-when-otherwise</q>
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </ActionListItem>
  );
};

interface MockForEachGroupMenuProps {
  initialOpen?: boolean;
  onConfigure?: () => void;
}

const MockForEachGroupMenu: FunctionComponent<MockForEachGroupMenuProps> = ({ initialOpen = false, onConfigure }) => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (initialOpen) setIsOpen(true);
  }, [initialOpen]);

  const handleSelect = (_e: MouseEvent | undefined, value: string | number | undefined) => {
    if (value === 'configure') {
      onConfigure?.();
    }
    setIsOpen(false);
  };

  return (
    <ActionListItem>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(open) => setIsOpen(open)}
        onSelect={handleSelect}
        toggle={(toggleRef: Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            icon={<EllipsisVIcon />}
            variant="plain"
            onClick={(_e: MouseEvent) => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            aria-label="for-each-group actions"
            style={{ height: INPUT_HEIGHT, padding: '0 0.25rem' }}
          />
        )}
        popperProps={{ position: 'end', preventOverflow: true }}
        zIndex={100}
      >
        <DropdownList>
          <DropdownItem key="configure" value="configure">
            Configure grouping
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </ActionListItem>
  );
};

export interface ForEachGroupMockupProps {
  phase: 'before-wrap' | 'configured';
  selectExpression?: string;
  groupingStrategy?: GroupingStrategy;
  groupingExpression?: string;
  outerMenuOpen?: boolean;
  forEachGroupMenuOpen?: boolean;
  innerMenuOpen?: boolean;
  modalOpen?: boolean;
  showInnerForEach?: boolean;
}

export const ForEachGroupMockup: FunctionComponent<ForEachGroupMockupProps> = ({
  phase,
  selectExpression = '',
  groupingStrategy = 'group-by',
  groupingExpression = '',
  outerMenuOpen = false,
  forEachGroupMenuOpen = false,
  innerMenuOpen = false,
  modalOpen = false,
  showInnerForEach = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    if (modalOpen) setIsModalOpen(true);
  }, [modalOpen]);
  const [shipOrderExpanded, setShipOrderExpanded] = useState(true);
  const [forEachGroupExpanded, setForEachGroupExpanded] = useState(true);
  const [innerForEachExpanded, setInnerForEachExpanded] = useState(true);
  const [itemExpanded, setItemExpanded] = useState(true);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const tooltipContent = (
    <div>
      <div>
        <strong>Strategy:</strong> {STRATEGY_LABELS[groupingStrategy]}
      </div>
      {groupingExpression && (
        <div>
          <strong>Expression:</strong> {groupingExpression}
        </div>
      )}
    </div>
  );

  const forEachGroupLabel = (
    <Tooltip content={tooltipContent}>
      <Label style={{ fontSize: '0.875rem', height: '1.25rem', cursor: 'default' }}>
        <span>for-each-group</span>
      </Label>
    </Tooltip>
  );

  const forEachLabel = (
    <Label style={{ fontSize: '0.875rem', height: '1.25rem' }}>
      <span>for-each</span>
    </Label>
  );

  return (
    <>
      <MockGroupingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        strategy={groupingStrategy}
        expression={groupingExpression}
      />

      <div
        style={{
          border: '1px solid var(--pf-t--global--border--color--default)',
          borderRadius: '4px',
          padding: '1rem',
          maxWidth: '640px',
          fontFamily: 'var(--pf-t--global--font--family--body)',
          background: 'var(--pf-t--global--background--color--primary--default)',
        }}
      >
        <div
          style={{
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--pf-t--global--border--color--default)',
          }}
        >
          <Title headingLevel="h5">Body</Title>
        </div>

        <MockTreeRow
          rank={0}
          title={<span style={{ fontWeight: 'bold', marginRight: '0.25rem' }}>ShipOrder</span>}
          isExpandable
          isExpanded={shipOrderExpanded}
          isCollection
          onToggle={() => setShipOrderExpanded(!shipOrderExpanded)}
        />

        {shipOrderExpanded && (
          <>
            {phase === 'before-wrap' ? (
              <MockTreeRow
                rank={1}
                title={<span>Item</span>}
                isExpandable
                isExpanded={false}
                isCollection
                actions={<MockCollectionFieldMenu initialOpen={outerMenuOpen} onWrapWithForEachGroup={openModal} />}
              />
            ) : (
              <>
                <MockTreeRow
                  rank={1}
                  title={forEachGroupLabel}
                  isExpandable
                  isExpanded={forEachGroupExpanded}
                  onToggle={() => setForEachGroupExpanded(!forEachGroupExpanded)}
                  actions={
                    <>
                      <MockExpressionInput value={selectExpression} placeholder="select XPath" />
                      <MockForEachGroupMenu initialOpen={forEachGroupMenuOpen} onConfigure={openModal} />
                      <MockTrashButton ariaLabel="Delete for-each-group" />
                    </>
                  }
                />

                {forEachGroupExpanded && (
                  <>
                    {showInnerForEach ? (
                      <>
                        <MockTreeRow
                          rank={2}
                          title={forEachLabel}
                          isExpandable
                          isExpanded={innerForEachExpanded}
                          onToggle={() => setInnerForEachExpanded(!innerForEachExpanded)}
                          actions={
                            <>
                              <MockExpressionInput value="current-group()" />
                              <MockTrashButton ariaLabel="Delete for-each" />
                            </>
                          }
                        />
                        {innerForEachExpanded && (
                          <>
                            <MockTreeRow
                              rank={3}
                              title={<span>Item</span>}
                              isExpandable
                              isExpanded={itemExpanded}
                              isCollection
                              onToggle={() => setItemExpanded(!itemExpanded)}
                            />
                            {itemExpanded && (
                              <>
                                <MockTreeRow
                                  rank={4}
                                  title={<span>Title</span>}
                                  isExpandable={false}
                                  actions={
                                    <>
                                      <MockExpressionInput value="Title" />
                                      <MockTrashButton ariaLabel="Delete Title mapping" />
                                    </>
                                  }
                                />
                                <MockTreeRow
                                  rank={4}
                                  title={<span>Quantity</span>}
                                  isExpandable={false}
                                  actions={
                                    <>
                                      <MockExpressionInput value="Quantity" />
                                      <MockTrashButton ariaLabel="Delete Quantity mapping" />
                                    </>
                                  }
                                />
                              </>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <MockTreeRow
                        rank={2}
                        title={<span>Item</span>}
                        isExpandable
                        isExpanded={false}
                        isCollection
                        actions={<MockInnerCollectionFieldMenu initialOpen={innerMenuOpen} />}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};
