import { BeanFactory } from '@kaoto/camel-catalog/types';
import {
  CanvasFormTabsContext,
  CanvasFormTabsContextResult,
  FilteredFieldProvider,
  KaotoForm,
  KaotoFormApi,
  KaotoFormProps,
} from '@kaoto/forms';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { cloneDeep } from 'lodash';
import { FunctionComponent, useCallback, useMemo, useRef, useState } from 'react';
import { KaotoSchemaDefinition } from '../../../../../../models';
import { isDefined } from '../../../../../../utils';

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
    <Modal
      isOpen
      variant={ModalVariant.large}
      data-testid={`NewBeanModal-${beanName}`}
      onClose={onCancelCreateBean}
      ouiaId="NewBeanModal"
    >
      <ModalHeader
        title={`Create a new ${propertyTitle} bean`}
        description={javaType ? `Java Type: ${javaType}` : ''}
      />

      <ModalBody>
        <FilteredFieldProvider>
          <CanvasFormTabsContext.Provider value={formTabsValue}>
            <KaotoForm
              data-testid="new-bean-form"
              schema={beanSchema}
              model={beanModel}
              onChange={setBeanModel as KaotoFormProps['onChange']}
              ref={formRef}
            />
          </CanvasFormTabsContext.Provider>
        </FilteredFieldProvider>
      </ModalBody>

      <ModalFooter>
        <Button key="confirm" variant="primary" onClick={handleConfirm} data-testid="create-bean-btn">
          Create
        </Button>
        <Button key="cancel" variant="link" onClick={onCancelCreateBean} data-testid="cancel-bean-btn">
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
