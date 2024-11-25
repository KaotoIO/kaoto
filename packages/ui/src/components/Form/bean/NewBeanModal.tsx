import { BeanFactory } from '@kaoto/camel-catalog/types';
import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { KaotoSchemaDefinition } from '../../../models';
import { MetadataEditor } from '../../MetadataEditor';
import { CustomAutoFormRef } from '../CustomAutoForm';
import { cloneDeep } from 'lodash';
import { isDefined } from '../../../utils';

export type NewBeanModalProps = {
  beanSchema: KaotoSchemaDefinition['schema'];
  beanName?: string;
  propertyTitle: string;
  javaType?: string;
  isOpen: boolean;
  onCreateBean: (model: BeanFactory) => void;
  onCancelCreateBean: () => void;
};

export const NewBeanModal: FunctionComponent<NewBeanModalProps> = (props: NewBeanModalProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [beanModel, setBeanModel] = useState<any>();
  const submitRef = useRef<CustomAutoFormRef>(null);

  useEffect(() => {
    setBeanModel(props.beanName ? { name: props.beanName } : {});
  }, [props.beanName]);

  const handleConfirm = useCallback(async () => {
    // validation updates the bean model, so we need to clone it to avoid creating the bean with default values
    const beanModelTmp = cloneDeep(beanModel);
    const valid = await submitRef.current?.form.validate();
    if (!isDefined(valid)) {
      props.onCreateBean(beanModelTmp as BeanFactory);
    }
  }, [beanModel, props]);

  const handleCancel = useCallback(() => {
    props.onCancelCreateBean();
  }, [props]);

  return (
    props.beanSchema && (
      <Modal
        variant={ModalVariant.large}
        data-testid={`NewBeanModal-${props.beanName}`}
        title={`Create a new ${props.propertyTitle} bean`}
        description={props.javaType ? `Java Type: ${props.javaType}` : ''}
        isOpen={props.isOpen}
        onClose={handleCancel}
        actions={[
          <Button key="confirm" variant="primary" onClick={handleConfirm} data-testid="create-bean-btn">
            Create
          </Button>,
          <Button key="cancel" variant="link" onClick={handleCancel} data-testid="cancel-bean-btn">
            Cancel
          </Button>,
        ]}
        ouiaId="NewBeanModal"
      >
        <MetadataEditor
          name={`${props.propertyTitle} Bean`}
          schema={props.beanSchema}
          metadata={beanModel}
          onChangeModel={setBeanModel}
          handleConfirm={handleConfirm}
          ref={submitRef}
        />
      </Modal>
    )
  );
};
