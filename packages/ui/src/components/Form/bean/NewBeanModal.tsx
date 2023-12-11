import { MetadataEditor } from '../../MetadataEditor';
import { Button, Modal } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSchemasStore } from '../../../store';
import { RegistryBeanDefinition } from '@kaoto-next/camel-catalog/types';

export type NewBeanModalProps = {
  beanName?: string;
  propertyTitle: string;
  javaType?: string;
  isOpen: boolean;
  onCreateBean: (model: RegistryBeanDefinition) => void;
  onCancelCreateBean: () => void;
};

export const NewBeanModal: FunctionComponent<NewBeanModalProps> = (props: NewBeanModalProps) => {
  const schemaMap = useSchemasStore((state) => state.schemas);
  const beanSchema = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beansSchema = schemaMap['beans']?.schema as any;
    const beanDefinition = beansSchema?.definitions['org.apache.camel.model.app.RegistryBeanDefinition'];
    if (!beanDefinition) {
      return undefined;
    }
    return {
      title: beansSchema.title,
      description: beansSchema.description,
      additionalProperties: false,
      type: 'object',
      properties: beanDefinition.properties,
      required: beanDefinition.required,
    };
  }, [schemaMap]);

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
        data-testid={`NewBeanModal-${props.beanName}`}
        title={`Create a new ${props.propertyTitle} bean`}
        description={props.javaType ? `Java Type: ${props.javaType}` : ''}
        isOpen={props.isOpen}
        onClose={handleCancel}
        actions={[
          <Button key="confirm" variant="primary" onClick={handleConfirm}>
            Create
          </Button>,
          <Button key="cancel" variant="link" onClick={handleCancel}>
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
