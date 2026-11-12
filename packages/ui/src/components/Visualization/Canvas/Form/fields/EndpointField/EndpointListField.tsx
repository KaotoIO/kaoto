import './EndpointListField.scss';

import { Add, Edit, TrashCan } from '@carbon/icons-react';
import { Column, Grid, IconButton } from '@carbon/react';
import { FieldProps, FieldWrapper, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

import { useEntityContext } from '../../../../../../hooks/useEntityContext/useEntityContext';
import { CitrusTestResource } from '../../../../../../models/citrus/citrus-test-resource';
import { EndpointsEntityHandler } from '../../../../../../models/visualization/metadata/citrus/endpoints-entity-handler';
import { ACTION_ID_CANCEL, ActionConfirmationModalContext } from '../../../../../../providers';
import { getValue } from '../../../../../../utils';
import { NewEndpointModal } from './NewEndpointModal';

export const EndpointListField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { onChange } = useFieldValue<Record<string, unknown>[]>(propName);
  const { camelResource: testResource } = useEntityContext();
  if (!(testResource instanceof CitrusTestResource)) {
    throw new TypeError('EndpointListField must be used only with CitrusTestResource');
  }

  const endpointsHandler = useMemo(() => new EndpointsEntityHandler(testResource), [testResource]);
  const endpointsSchema = testResource.getEndpointsSchema();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [operation, setOperation] = useState<string>('Create');
  const [editModel, setEditModel] = useState<Record<string, unknown> | undefined>(undefined);
  const [endpointType, setEndpointType] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<{ name: string; type: string }[]>(
    endpointsHandler.getDefinedEndpointsNameAndType(),
  );
  const confirmModalContext = useContext(ActionConfirmationModalContext);

  const handleCreateOrEdit = useCallback(
    async (type: string, model: Record<string, unknown>) => {
      if (!type || model === undefined || typeof model !== 'object' || model?.name === undefined) {
        return;
      }

      if (operation === 'Create') {
        endpointsHandler.addNewEndpoint(type, model);
        setItems(endpointsHandler.getDefinedEndpointsNameAndType());
      } else if (operation === 'Update') {
        const prevName = editModel?.name as string;
        if (prevName !== model.name) {
          /** Endpoint rename must be confirmed by modal */
          const modalAnswer = await confirmModalContext?.actionConfirmation({
            title: 'Rename endpoint?',
            text: 'Renaming an endpoint may cause existing references to become invalid. Are you sure?',
          });

          if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;
        }

        endpointsHandler.updateEndpoint(type, model, prevName);
        if (prevName !== model.name) {
          setItems(endpointsHandler.getDefinedEndpointsNameAndType());
        }
      }

      onChange(endpointsHandler.getEndpoints());
      setIsOpen(false);
    },
    [endpointsHandler, editModel, onChange, operation, confirmModalContext],
  );

  const handleEdit = useCallback(
    (index: number) => {
      const model = endpointsHandler.getEndpoint(index);
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
    [endpointsHandler],
  );

  const handleDelete = useCallback(
    async (index: number) => {
      /** Endpoint deletion must be confirmed by modal */
      const modalAnswer = await confirmModalContext?.actionConfirmation({
        title: 'Delete endpoint?',
        text: 'Deleting an endpoint may cause existing references to become invalid. Are you sure?',
      });

      if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;

      endpointsHandler.deleteEndpoint(index);
      setItems(endpointsHandler.getDefinedEndpointsNameAndType());
      onChange(endpointsHandler.getEndpoints());
    },
    [endpointsHandler, onChange, confirmModalContext],
  );

  const handleCancel = useCallback(() => {
    setEditModel(undefined);
    setIsOpen(false);
  }, []);

  const handleAdd = useCallback(() => {
    setEndpointType(undefined);
    setEditModel(undefined);
    setOperation('Create');
    setIsOpen(true);
  }, []);

  return (
    <>
      <FieldWrapper propName={propName} required={required} title="" type="string" hideInfo>
        <div role="table" aria-label="endpoint-table">
          <Grid className="endpoint-list-grid" role="row">
            <Column sm={2} md={3} lg={6} role="columnheader">
              <strong>Name</strong>
            </Column>
            <Column sm={2} md={3} lg={6} role="columnheader">
              <strong>Type</strong>
            </Column>
            <Column sm={4} md={2} lg={4} role="columnheader">
              <IconButton
                kind="ghost"
                onClick={handleAdd}
                label="Add a new endpoint"
                data-testid="create-new-endpoint-btn"
              >
                <Add />
              </IconButton>
            </Column>
          </Grid>

          <hr />

          {items.map((item, index) => (
            <Grid className="endpoint-list-grid" role="row" key={item.name}>
              <Column sm={2} md={3} lg={6} role="cell">
                {item.name}
              </Column>
              <Column sm={2} md={3} lg={6} role="cell">
                {item.type}
              </Column>
              <Column sm={4} md={2} lg={4} role="cell">
                <IconButton
                  kind="ghost"
                  label={`Edit ${item.name}`}
                  data-testid={'endpoint-edit-' + index + '-btn'}
                  onClick={() => {
                    handleEdit(index);
                  }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  kind="ghost"
                  label={`Delete ${item.name}`}
                  data-testid={'endpoint-delete-' + index + '-btn'}
                  onClick={() => handleDelete(index)}
                >
                  <TrashCan />
                </IconButton>
              </Column>
            </Grid>
          ))}
        </div>
      </FieldWrapper>

      {isOpen && (
        <NewEndpointModal
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
