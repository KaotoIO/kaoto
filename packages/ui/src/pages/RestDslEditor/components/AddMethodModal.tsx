import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { CanvasFormTabsProvider, isDefined, KaotoForm, KaotoFormApi } from '@kaoto/forms';
import { FunctionComponent, useCallback, useRef, useState } from 'react';

import { customFieldsFactoryfactory } from '../../../components/Visualization/Canvas/Form/fields/custom-fields-factory';
import { SuggestionRegistrar } from '../../../components/Visualization/Canvas/Form/suggestions/SuggestionsProvider';
import { ADD_METHOD_SCHEMA, AddMethodFormModel } from './add-method-schema';

interface AddMethodModalProps {
  onClose: () => void;
  onAddMethod: (model: AddMethodFormModel) => void;
}

export const AddMethodModal: FunctionComponent<AddMethodModalProps> = ({ onClose, onAddMethod }) => {
  const [formModel, setFormModel] = useState<Partial<AddMethodFormModel>>({
    method: 'get',
  });
  const formRef = useRef<KaotoFormApi>(null);

  const handleAdd = useCallback(async () => {
    const valid = formRef.current?.validate();
    if (isDefined(formModel) && !isDefined(valid)) {
      onAddMethod(formModel as AddMethodFormModel);
      onClose();
    }
  }, [formModel, onAddMethod, onClose]);

  return (
    <ComposedModal open size="sm" data-testid="add-method-modal" onClose={onClose}>
      <ModalHeader title="Add REST Method" />

      <ModalBody>
        <CanvasFormTabsProvider tab="All">
          <SuggestionRegistrar>
            <KaotoForm
              schema={ADD_METHOD_SCHEMA}
              model={formModel}
              onChange={setFormModel as (model: unknown) => void}
              ref={formRef}
              customFieldsFactory={customFieldsFactoryfactory}
            />
          </SuggestionRegistrar>
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
