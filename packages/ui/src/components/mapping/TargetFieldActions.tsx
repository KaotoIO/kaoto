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
import { TransformationEditor } from '../transformation/TransformationEditor';
import { TransformationService } from '../../services/transformation.service';
import { useDataMapper } from '../../hooks';
import { MappingService } from '../../services/mapping.service';
import { IField } from '../../models/document';
import { useCanvas } from '../../hooks/useCanvas';
import { DnDHandler } from '../../providers/dnd/DnDHandler';
import { TransformationEditorDnDHandler } from '../../providers/dnd/TransformationEditorDnDHandler';

type TargetFieldActionsProps = {
  field: IField;
};

export const TargetFieldActions: FunctionComponent<TargetFieldActionsProps> = ({ field }) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();
  const { getActiveHandler, setActiveHandler } = useCanvas();
  const correlatedMappings = MappingService.getMappingsFor(mappingTree, field);
  const mapping = correlatedMappings.length === 1 ? correlatedMappings[0] : undefined;
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const originalDnDHandlerRef = useRef<DnDHandler | undefined>();
  const dndHandler = useMemo(() => new TransformationEditorDnDHandler(), []);
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

  const expression = useMemo(() => {
    return mapping ? TransformationService.toExpression(mapping.source) : '';
  }, [mapping]);

  const handleExpressionChange = useCallback(
    (_event: FormEvent, value: string) => {
      if (mapping) {
        mapping.source = TransformationService.fromExpression(value);
        refreshMappingTree();
      }
    },
    [mapping, refreshMappingTree],
  );

  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const onToggleActionMenu = useCallback(() => setIsActionMenuOpen(!isActionMenuOpen), [isActionMenuOpen]);
  const onSelectAction = useCallback(
    (_event: MouseEvent | undefined, value: string | number | undefined) => {
      switch (value) {
        case 'editor':
          setIsEditorOpen(true);
          break;
        case 'if':
          MappingService.wrapWithIf(mapping);
          break;
        case 'choose':
          MappingService.wrapWithChoose(mapping);
      }
      setIsActionMenuOpen(false);
    },
    [mapping],
  );

  return (
    mapping && (
      <ActionList>
        <ActionListGroup key="transformation-expression-input">
          <ActionListItem>
            <InputGroup>
              <InputGroupItem>
                <TextInput
                  data-testid="transformation-expression-input"
                  id="expression"
                  type="text"
                  value={expression}
                  onChange={handleExpressionChange}
                />
              </InputGroupItem>
            </InputGroup>
          </ActionListItem>
        </ActionListGroup>
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
              <DropdownItem key="editor" value="editor" icon={<PencilAltIcon />}>
                Open Expression Editor
              </DropdownItem>
              <DropdownItem key="if" value="if">
                Add <q>if</q> Condition
              </DropdownItem>
              <DropdownItem key="choose" value="choose">
                Add <q>choose</q> Condition
              </DropdownItem>
            </DropdownList>
          </Dropdown>
          <Modal
            className="transformation-editor-modal"
            position="top"
            title={`Transformation Editor: ${field.fieldIdentifier.toString()}`}
            variant={ModalVariant.large}
            isOpen={isEditorOpen}
            onClose={closeTransformationEditor}
            actions={[
              <Button key="close-transformation-editor" onClick={closeTransformationEditor}>
                Close
              </Button>,
            ]}
          >
            <TransformationEditor mapping={mapping} />
          </Modal>
        </ActionListGroup>
        <ActionListGroup key="transformation-editor">
          <ActionListItem>
            <Button
              size="sm"
              variant="plain"
              component="small"
              aria-label="Transformation Editor"
              data-testid={`edit-transformation-${field.ownerDocument?.documentId}-${field.name}-button`}
              onClick={launchTransformationEditor}
              className="document-field__button"
              icon={<PencilAltIcon />}
            />
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    )
  );
};
