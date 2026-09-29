import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { BeanFactory } from '@kaoto/camel-catalog/types';
import {
  CanvasFormTabsContext,
  CanvasFormTabsContextResult,
  FilteredFieldProvider,
  isDefined,
  KaotoForm,
  KaotoFormApi,
  KaotoFormProps,
} from '@kaoto/forms';
import { cloneDeep } from 'lodash';
import { FunctionComponent, useCallback, useMemo, useRef, useState } from 'react';

import { KaotoSchemaDefinition } from '../../../../../../models';
import { SuggestionRegistrar } from '../../suggestions/SuggestionsProvider';

export type NewBeanModalProps = {
  beanSchema?: KaotoSchemaDefinition['schema'];
  beanName?: string;
  propertyTitle: string;
  javaType?: string;
  onCreateBean: (model: BeanFactory) => void;
  onCancelCreateBean: () => void;
};

export const NewBeanModal: FunctionComponent<NewBeanModalProps> = ({
  beanName,
  javaType,
  propertyTitle,
  beanSchema,
  onCreateBean,
  onCancelCreateBean,
}) => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const [beanModel, setBeanModel] = useState<unknown>({ name: beanName, type: javaType });
  const formRef = useRef<KaotoFormApi>(null);

  const handleConfirm = useCallback(async () => {
    // validation updates the bean model, so we need to clone it to avoid creating the bean with default values
    const beanModelTmp = cloneDeep(beanModel);
    const valid = formRef.current?.validate();
    if (!isDefined(valid)) {
      onCreateBean(beanModelTmp as BeanFactory);
    }
  }, [beanModel, onCreateBean]);

  if (!isDefined(beanSchema)) {
    return null;
  }

  return (
    <ComposedModal open size="lg" data-testid={`NewBeanModal-${beanName}`} onClose={onCancelCreateBean}>
      <ModalHeader title={`Create a new ${propertyTitle} bean`} label={javaType ? `Java Type: ${javaType}` : ''} />

      <ModalBody>
        <FilteredFieldProvider>
          <CanvasFormTabsContext.Provider value={formTabsValue}>
            <SuggestionRegistrar>
              <KaotoForm
                data-testid="new-bean-form"
                schema={beanSchema}
                model={beanModel}
                onChange={setBeanModel as KaotoFormProps['onChange']}
                ref={formRef}
              />
            </SuggestionRegistrar>
          </CanvasFormTabsContext.Provider>
        </FilteredFieldProvider>
      </ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={onCancelCreateBean} data-testid="cancel-bean-btn">
          Cancel
        </Button>
        <Button kind="primary" onClick={handleConfirm} data-testid="create-bean-btn">
          Create
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
