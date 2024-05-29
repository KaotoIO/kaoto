import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  InputGroup,
  InputGroupItem,
  Modal,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { FormEvent, FunctionComponent, MouseEvent, useCallback, useMemo, useState } from 'react';
import { PencilAltIcon } from '@patternfly/react-icons';
import { TransformationEditor } from '../transformation/TransformationEditor';
import { TransformationService } from '../../services/transformation.service';
import { useDataMapper } from '../../hooks';
import { MappingService } from '../../services/mapping.service';
import { IField } from '../../models/document';

type TargetFieldActionsProps = {
  field: IField;
};

export const TargetFieldActions: FunctionComponent<TargetFieldActionsProps> = ({ field }) => {
  const { mappings, refreshMappings } = useDataMapper();
  const correlatedMappings = MappingService.getMappingsFor(mappings, field);
  const mapping = correlatedMappings.length === 1 ? correlatedMappings[0] : undefined;
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const launchTransformationEditor = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setIsEditorOpen(true);
    event.stopPropagation();
  }, []);

  const closeTransformationEditor = useCallback(() => setIsEditorOpen(false), []);

  const expression = useMemo(() => {
    return mapping ? TransformationService.toExpression(mapping.source) : '';
  }, [mapping]);

  const handleExpressionChange = useCallback(
    (_event: FormEvent, value: string) => {
      if (mapping) {
        mapping.source = TransformationService.fromExpression(value);
        refreshMappings();
      }
    },
    [mapping, refreshMappings],
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
      </ActionList>
    )
  );
};
