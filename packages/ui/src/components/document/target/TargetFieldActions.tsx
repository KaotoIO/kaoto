import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  InputGroup,
  InputGroupItem,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { FormEvent, FunctionComponent, MouseEvent, Ref, useCallback, useMemo, useRef, useState } from 'react';
import { PencilAltIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { TransformationEditor } from '../../transformation/TransformationEditor';
import { MappingService } from '../../../services/mapping.service';
import { useCanvas } from '../../../hooks/useCanvas';
import { DnDHandler } from '../../../providers/dnd/DnDHandler';
import { TransformationEditorDnDHandler } from '../../../providers/dnd/TransformationEditorDnDHandler';
import { NodeData } from '../../../models/visualization';
import { useDataMapper } from '../../../hooks';
import { ExpressionItem, MappingItem } from '../../../models/mapping';

type ExpressionInputProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};

const ExpressionInputAction: FunctionComponent<ExpressionInputProps> = ({ mapping, onUpdate }) => {
  const handleExpressionChange = useCallback(
    (_event: FormEvent, value: string) => {
      if (mapping) {
        mapping.expression = value;
        onUpdate();
      }
    },
    [mapping, onUpdate],
  );

  return (
    <ActionListGroup key="transformation-expression-input">
      <ActionListItem>
        <InputGroup>
          <InputGroupItem>
            <TextInput
              data-testid="transformation-expression-input"
              id="expression"
              type="text"
              value={mapping.expression as string}
              onChange={handleExpressionChange}
            />
          </InputGroupItem>
        </InputGroup>
      </ActionListItem>
    </ActionListGroup>
  );
};

type ExpressionEditorProps = {
  nodeData: NodeData;
  mapping: ExpressionItem;
  onUpdate: () => void;
};

const ExpressionEditorAction: FunctionComponent<ExpressionEditorProps> = ({ nodeData, mapping, onUpdate }) => {
  const { getActiveHandler, setActiveHandler } = useCanvas();
  const originalDnDHandlerRef = useRef<DnDHandler | undefined>();
  const dndHandler = useMemo(() => new TransformationEditorDnDHandler(), []);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const launchTransformationEditor = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      originalDnDHandlerRef.current = getActiveHandler();
      setActiveHandler(dndHandler);
      setIsEditorOpen(true);
      event.stopPropagation();
    },
    [dndHandler, getActiveHandler, setActiveHandler],
  );
  const closeTransformationEditor = useCallback(() => {
    setActiveHandler(originalDnDHandlerRef.current);
    setIsEditorOpen(false);
  }, [setActiveHandler]);

  return (
    <ActionListGroup key="transformation-editor">
      <ActionListItem>
        <Button
          size="sm"
          variant="plain"
          component="small"
          aria-label="Transformation Editor"
          data-testid={`edit-transformation-button-${nodeData.id}`}
          onClick={launchTransformationEditor}
          className="document-field__button"
          icon={<PencilAltIcon />}
        />
      </ActionListItem>
      <Modal
        className="transformation-editor-modal"
        position="top"
        title={`Transformation Editor: ${nodeData.title}`}
        variant={ModalVariant.large}
        isOpen={isEditorOpen}
        onClose={closeTransformationEditor}
        actions={[
          <Button key="close-transformation-editor" onClick={closeTransformationEditor}>
            Close
          </Button>,
        ]}
      >
        <TransformationEditor mapping={mapping} onUpdate={onUpdate} />
      </Modal>
    </ActionListGroup>
  );
};

type ConditionMenuProps = {
  nodeData: NodeData;
  mapping: MappingItem;
  onUpdate: () => void;
};

const ConditionMenuAction: FunctionComponent<ConditionMenuProps> = ({ nodeData }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const onToggleActionMenu = useCallback(() => setIsActionMenuOpen(!isActionMenuOpen), [isActionMenuOpen]);
  const onSelectAction = useCallback(
    (_event: MouseEvent | undefined, value: string | number | undefined) => {
      switch (value) {
        case 'if':
          MappingService.wrapWithIf(mapping);
          break;
        case 'choose':
          MappingService.wrapWithChoose(mapping);
          break;
        case 'foreach':
          MappingService.wrapWithForEach(mapping);
          break;
        case 'sort':
          MappingService.wrapWithSort(mapping);
      }
      setIsActionMenuOpen(false);
    },
    [mapping],
  );

  return (
    <ActionListGroup key="transformation-actions">
      <Dropdown
        onSelect={onSelectAction}
        toggle={(toggleRef: Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={onToggleActionMenu}
            variant="plain"
            isExpanded={isActionMenuOpen}
            aria-label="Transformation Action list"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        isOpen={isActionMenuOpen}
        onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
      >
        <DropdownList>
          <DropdownItem key="if" value="if">
            Add <q>if</q>
          </DropdownItem>
          <DropdownItem key="choose" value="choose">
            Add <q>choose</q>
          </DropdownItem>
          <DropdownItem key="foreach" value="foreach">
            Add <q>for-each</q>
          </DropdownItem>
          <DropdownItem key="sort" value="sort">
            Add <q>sort</q>
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </ActionListGroup>
  );
};

type TargetFieldActionsProps = {
  nodeData: NodeData;
};

export const TargetFieldActions: FunctionComponent<TargetFieldActionsProps> = ({ nodeData }) => {
  const { refreshMappingTree } = useDataMapper();
  const mapping = 'mapping' in nodeData ? (nodeData.mapping! as ExpressionItem) : undefined;

  return (
    <ActionList>
      {mapping && (
        <>
          <ExpressionInputAction mapping={mapping} onUpdate={refreshMappingTree} />
          <ExpressionEditorAction nodeData={nodeData} mapping={mapping} onUpdate={refreshMappingTree} />
        </>
      )}
      <ConditionMenuAction nodeData={nodeData} mapping={mapping} onUpdate={refreshMappingTree} />
    </ActionList>
  );
};
