import { FieldProps, FieldWrapper, useFieldValue } from '@kaoto/forms';
import { Button } from '@patternfly/react-core';
import { EditIcon, PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import { Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

import { CitrusTestResource } from '../../../../../../models/citrus/citrus-test-resource';
import { EndpointsEntityHandler } from '../../../../../../models/visualization/metadata/citrus/endpoints-entity-handler';
import { ACTION_ID_CANCEL, ActionConfirmationModalContext, EntitiesContext } from '../../../../../../providers';
import { getValue } from '../../../../../../utils';
import { EndpointModal } from './EndpointModal';

export const EndpointsField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { value = [], onChange } = useFieldValue<Record<string, unknown>[]>(propName);
  const entitiesContext = useContext(EntitiesContext);
  const testResource = entitiesContext?.camelResource as CitrusTestResource | undefined;
  const endpointsHandler = useMemo(() => new EndpointsEntityHandler(testResource), [testResource]);
  const endpointsSchema = useMemo(() => endpointsHandler.getEndpointsSchema(), [endpointsHandler]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [operation, setOperation] = useState<string>('Create');
  const [editModel, setEditModel] = useState<Record<string, unknown> | undefined>(undefined);
  const [endpointType, setEndpointType] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<{ name: string; type: string }[]>(
    endpointsHandler.getDefinedEndpointsNameAndType(value),
  );
  const renameEndpointModalContext = useContext(ActionConfirmationModalContext);

  const handleCreateOrEdit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (type: string, model: any) => {
      if (!type || model === undefined || typeof model !== 'object' || model?.name === undefined) {
        return;
      }

      if (operation === 'Create') {
        endpointsHandler.addNewEndpoint(type, model as unknown as Record<string, unknown>);
        setItems(endpointsHandler.getDefinedEndpointsNameAndType(value));
      } else if (operation === 'Update') {
        const prevName = editModel?.name as string;
        if (prevName !== model.name) {
          /** Endpoint rename must be confirmed by modal */
          const modalAnswer = await renameEndpointModalContext?.actionConfirmation({
            title: 'Rename endpoint?',
            text: 'Renaming an endpoint may cause existing references to become invalid. Are you sure?',
          });

          if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;
        }

        endpointsHandler.updateEndpoint(type, model as unknown as Record<string, unknown>, prevName);
        if (prevName !== model.name) {
          setItems(endpointsHandler.getDefinedEndpointsNameAndType(value));
        }
      }

      onChange(value);
      setIsOpen(false);
    },
    [endpointsHandler, editModel, onChange, operation, renameEndpointModalContext, value],
  );

  const handleEdit = useCallback(
    (index: number) => {
      const model = value[index];
      if (model) {
        const type = endpointsHandler.getEndpointType(model as Record<string, unknown>);
        if (type) {
          setEndpointType(type.replace(/\./g, '-'));
          setEditModel(getValue(model, type));
          setOperation('Update');
          setIsOpen(true);
        }
      }
    },
    [endpointsHandler, value],
  );

  const handleDelete = useCallback(
    (index: number) => {
      value.splice(index, 1);
      onChange(value);
      setItems(endpointsHandler.getDefinedEndpointsNameAndType(value));
    },
    [endpointsHandler, onChange, value],
  );

  const handleCancel = useCallback(() => {
    setEditModel(undefined);
    setIsOpen(false);
  }, []);

  const handleAdd = useCallback(() => {
    setOperation('Create');
    setIsOpen(true);
  }, []);

  return (
    <>
      <FieldWrapper propName={propName} required={required} title={''} type="string">
        <Table aria-label={'endpoint-table'} variant={TableVariant.compact} borders>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((item, index) => (
              <Tr key={item.name}>
                <Td style={{ textTransform: 'none' }}>{item.name}</Td>
                <Td style={{ textTransform: 'none' }}>{item.type}</Td>
                <Td>
                  <Button
                    title={`Edit ${item.name}`}
                    data-testid={'endpoint-edit-' + index + '-btn'}
                    icon={<EditIcon />}
                    variant="link"
                    onClick={() => handleEdit(index)}
                  />
                  <Button
                    title={`Delete ${item.name}`}
                    data-testid={'endpoint-delete-' + index + '-btn'}
                    icon={<TrashIcon />}
                    variant="link"
                    onClick={() => handleDelete(index)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        <Button
          icon={<PlusCircleIcon />}
          key="create"
          variant="link"
          onClick={handleAdd}
          data-testid="create-new-endpoint-btn"
        >
          Add
        </Button>
      </FieldWrapper>

      {isOpen && (
        <EndpointModal
          mode={operation}
          endpoint={editModel}
          type={endpointType}
          endpointsSchema={endpointsSchema}
          onConfirm={handleCreateOrEdit}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
