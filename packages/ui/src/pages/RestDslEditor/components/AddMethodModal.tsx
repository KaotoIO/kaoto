import {
  Button,
  ComposedModal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from '@carbon/react';
import { FunctionComponent, RefObject, useCallback, useEffect, useState } from 'react';

import { REST_DSL_VERBS, RestMethods } from '../../../models/special-processors.constants';
import { AddMethodFormModel } from './add-method-schema';

/**
 * Props for the AddMethodModal component.
 */
interface AddMethodModalProps {
  open: boolean;
  launcherButtonRef?: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onAddMethod: (model: AddMethodFormModel) => void;
}

/**
 * Modal dialog for adding a new REST method to a REST service.
 * Displays a form with fields for HTTP method type, path, and optional ID.
 *
 * NOTE: The HTTP Method field intentionally uses a plain Carbon `<Select>` instead of
 * the `KaotoForm` EnumField (typeahead). The Carbon typeahead does not fire its
 * selection callback when the user types an exact match and confirms with Enter — it
 * only closes the dropdown visually, leaving the underlying value unchanged.
 * A plain `<Select>` has correct keyboard behaviour by default.
 * See: https://github.com/KaotoIO/kaoto/issues/3474
 */
export const AddMethodModal: FunctionComponent<AddMethodModalProps> = ({
  open,
  launcherButtonRef,
  onClose,
  onAddMethod,
}) => {
  const [method, setMethod] = useState<RestMethods>('get');
  const [path, setPath] = useState('');
  const [id, setId] = useState('');
  const [pathError, setPathError] = useState('');

  useEffect(() => {
    if (open) {
      setMethod('get');
      setPath('');
      setId('');
      setPathError('');
    }
  }, [open]);

  /** Validates the form and adds the method if valid */
  const handleAdd = useCallback(() => {
    if (!path.trim()) {
      setPathError('Path is required');
      return;
    }
    onAddMethod({ method, path: path.trim(), id: id.trim() || undefined });
    onClose();
  }, [method, path, id, onAddMethod, onClose]);

  return (
    <ComposedModal
      open={open}
      launcherButtonRef={launcherButtonRef}
      size="sm"
      onClose={onClose}
      data-testid="add-method-modal"
    >
      <ModalHeader title="Add REST Method" />

      <ModalBody>
        <Stack gap={5}>
          <Select
            id="add-method-http-method"
            labelText="HTTP Method"
            value={method}
            onChange={(e) => {
              setMethod(e.target.value as RestMethods);
            }}
            data-testid="add-method-http-method"
          >
            {REST_DSL_VERBS.map((verb) => (
              <SelectItem key={verb} value={verb} text={verb} />
            ))}
          </Select>
          <TextInput
            id="add-method-path"
            labelText="Path"
            placeholder="/{id}"
            helperText="The REST endpoint path. Example: /{id}"
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              setPathError('');
            }}
            invalid={!!pathError}
            invalidText={pathError}
            data-testid="add-method-path"
          />
          <TextInput
            id="add-method-id"
            labelText="ID"
            helperText="Optional identifier for the method"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
            }}
            data-testid="add-method-id"
          />
        </Stack>
      </ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={onClose} data-testid="add-method-modal-cancel-btn">
          Cancel
        </Button>
        <Button kind="primary" onClick={handleAdd} data-testid="add-method-modal-add-btn">
          Add
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
