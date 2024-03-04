import { MetadataEditor } from '../../MetadataEditor';
import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { RegistryBeanDefinition } from '@kaoto-next/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../../models';

export type NewBeanModalProps = {
  beanName?: string;
  propertyTitle: string;
  javaType?: string;
  isOpen: boolean;
  onCreateBean: (model: RegistryBeanDefinition) => void;
  onCancelCreateBean: () => void;
};

export const NewBeanModal: FunctionComponent<NewBeanModalProps> = (props: NewBeanModalProps) => {
  const beanSchema = useMemo(() => {
    const beanCatalog = CamelCatalogService.getComponent(CatalogKind.Entity, 'bean');
    return beanCatalog?.propertiesSchema;
  }, []);

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
    beanSchema && (
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
          schema={beanSchema}
          metadata={beanModel}
          onChangeModel={setBeanModel}
        />
      </Modal>
    )
  );
};
