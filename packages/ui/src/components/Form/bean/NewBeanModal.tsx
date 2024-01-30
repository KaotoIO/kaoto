import { MetadataEditor } from '../../MetadataEditor';
import { Button, Modal } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { RegistryBeanDefinition } from '@kaoto-next/camel-catalog/types';
import { JSONSchemaType } from 'ajv';

export type NewBeanModalProps = {
  beanSchema: JSONSchemaType<unknown>;
  beanName?: string;
  propertyTitle: string;
  javaType?: string;
  isOpen: boolean;
  onCreateBean: (model: RegistryBeanDefinition) => void;
  onCancelCreateBean: () => void;
};

export const NewBeanModal: FunctionComponent<NewBeanModalProps> = (props: NewBeanModalProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [beanModel, setBeanModel] = useState<any>();

  useEffect(() => {
    setBeanModel(props.beanName ? { name: props.beanName } : {});
  }, [props.beanName]);

  const handleConfirm = useCallback(() => {
    props.onCreateBean(beanModel as RegistryBeanDefinition);
  }, [beanModel, props]);

  const handleCancel = useCallback(() => {
    props.onCancelCreateBean();
  }, [props]);

  return (
    props.beanSchema && (
      <Modal
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
        />
      </Modal>
    )
  );
};
