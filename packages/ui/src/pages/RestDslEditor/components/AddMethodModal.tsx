import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { CanvasFormTabsProvider, isDefined, KaotoForm, KaotoFormApi } from '@kaoto/forms';
import { FunctionComponent, useCallback, useRef, useState } from 'react';

import { customFieldsFactoryfactory } from '../../../components/Visualization/Canvas/Form/fields/custom-fields-factory';
import { ADD_METHOD_SCHEMA, AddMethodFormModel } from './add-method-schema';

/**
 * Props for the AddMethodModal component.
 */
interface AddMethodModalProps {
  onClose: () => void;
  onAddMethod: (model: AddMethodFormModel) => void;
}

/**
 * Modal dialog for adding a new REST method to a REST service.
 * Displays a form with fields for HTTP method type, path, and optional ID.
 */
export const AddMethodModal: FunctionComponent<AddMethodModalProps> = ({ onClose, onAddMethod }) => {
  const [formModel, setFormModel] = useState<Partial<AddMethodFormModel>>({
    method: 'get',
  });
  const formRef = useRef<KaotoFormApi>(null);

  /** Validates the form and adds the method if valid */
  const handleAdd = useCallback(async () => {
    const valid = formRef.current?.validate();
    if (isDefined(formModel) && !isDefined(valid)) {
      onAddMethod(formModel as AddMethodFormModel);
      onClose();
    }
  }, [formModel, onAddMethod, onClose]);

  const onChangeProp = (propName: string, value: unknown) => {
    const parsedValue = typeof value === 'string' ? value.trim() : value;
    setFormModel((prev) => ({ ...prev, [propName]: parsedValue }));
  };

  return (
    <ComposedModal open size="sm" onClose={onClose} data-testid="add-method-modal">
      <ModalHeader title="Add REST Method" />

      <ModalBody>
        <CanvasFormTabsProvider tab="All">
          <KaotoForm
            schema={ADD_METHOD_SCHEMA}
            model={formModel}
            onChangeProp={onChangeProp}
            ref={formRef}
            customFieldsFactory={customFieldsFactoryfactory}
          />
        </CanvasFormTabsProvider>
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
