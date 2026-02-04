import {
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { REST_DSL_VERBS } from '../../../models/special-processors.constants';
import { getOperationFieldHelp, OperationTypeHelp } from '../RestDslDetails';
import { RestVerb } from '../restDslTypes';
import { RestDslOperationVerbSelect } from './RestDslOperationVerbSelect';

const REST_METHODS = REST_DSL_VERBS;

interface RestDslAddOperationModalProps {
  isOpen: boolean;
  restId: string | undefined;
  onClose: () => void;
  onCreateOperation: (restId: string, verb: RestVerb, operationId: string, operationPath: string) => void;
}

export const RestDslAddOperationModal: FunctionComponent<RestDslAddOperationModalProps> = ({
  isOpen,
  restId,
  onClose,
  onCreateOperation,
}) => {
  const [operationId, setOperationId] = useState('');
  const [operationPath, setOperationPath] = useState('');
  const [operationVerb, setOperationVerb] = useState<RestVerb>('get');
  const [isVerbSelectOpen, setIsVerbSelectOpen] = useState(false);
  const uriInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOperationVerb('get');
      setOperationId(getCamelRandomId('rest'));
      setOperationPath('');
      requestAnimationFrame(() => {
        uriInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const handleVerbToggle = useCallback(() => {
    setIsVerbSelectOpen((prev) => !prev);
  }, []);

  const handleCreate = useCallback(() => {
    if (!restId || !operationPath.trim()) return;
    onCreateOperation(restId, operationVerb, operationId, operationPath);
  }, [restId, operationVerb, operationId, operationPath, onCreateOperation]);

  return (
    <Modal
      isOpen={isOpen}
      variant={ModalVariant.small}
      onClose={onClose}
      aria-label="Add REST Operation"
      className="rest-dsl-add-operation-modal"
    >
      <ModalHeader title="Add REST Operation" />
      <ModalBody>
        <Form>
          <FormGroup
            label="Operation Id"
            fieldId="rest-operation-id"
            labelHelp={getOperationFieldHelp(operationVerb, 'id', 'Id')}
          >
            <TextInput id="rest-operation-id" value={operationId} onChange={(_event, value) => setOperationId(value)} />
          </FormGroup>
          <FormGroup
            label="URI"
            fieldId="rest-operation-uri"
            isRequired
            labelHelp={getOperationFieldHelp(operationVerb, 'path', 'Path')}
          >
            <TextInput
              id="rest-operation-uri"
              value={operationPath}
              onChange={(_event, value) => setOperationPath(value)}
              isRequired
              ref={uriInputRef}
            />
          </FormGroup>
          <FormGroup label="Operation Type" fieldId="rest-operation-type" isRequired labelHelp={<OperationTypeHelp />}>
            <RestDslOperationVerbSelect
              isOpen={isVerbSelectOpen}
              selected={operationVerb}
              verbs={REST_METHODS}
              onSelect={(value) => {
                setOperationVerb(value);
                setIsVerbSelectOpen(false);
              }}
              onOpenChange={setIsVerbSelectOpen}
              onToggle={handleVerbToggle}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleCreate} isDisabled={!operationPath.trim()}>
          Add Operation
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
