import { isDefined } from '@kaoto/forms';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';

import { useRuntimeContext } from '../../../hooks/useRuntimeContext/useRuntimeContext';
import { SourceSchemaType } from '../../../models/camel';
import { FlowTemplateService } from '../../../models/visualization/flows/support/flow-templates-service';
import { useSourceCodeStore } from '../../../store';
import { findCatalog, requiresCatalogChange } from '../../../utils/catalog-helper';

interface ConfirmIntegrationTypeChangeModalProps {
  proposedFlowType: SourceSchemaType | undefined;
  onClose: () => void;
}

const DEFAULT_DESCRIPTION =
  'Changing the source type will remove any existing integration and you will lose your current work.';

export const ConfirmIntegrationTypeChangeModal: FunctionComponent<ConfirmIntegrationTypeChangeModalProps> = ({
  proposedFlowType,
  onClose,
}) => {
  const runtimeContext = useRuntimeContext();
  const setCodeAndNotify = useSourceCodeStore((state) => state.setCodeAndNotify);
  const changesCatalog =
    proposedFlowType !== undefined && requiresCatalogChange(proposedFlowType, runtimeContext.selectedCatalog);

  const onConfirm = useCallback(() => {
    if (proposedFlowType) {
      setCodeAndNotify(FlowTemplateService.getFlowYamlTemplate(proposedFlowType));

      if (changesCatalog) {
        const matchingCatalog = findCatalog(proposedFlowType, runtimeContext.catalogLibrary);
        if (isDefined(matchingCatalog)) {
          runtimeContext.setSelectedCatalog(matchingCatalog);
        }
      }

      onClose();
    }
  }, [proposedFlowType, setCodeAndNotify, changesCatalog, onClose, runtimeContext]);

  if (!proposedFlowType) {
    return null;
  }

  return (
    <Modal isOpen variant={ModalVariant.small} data-testid="confirmation-modal" onClose={onClose}>
      <ModalHeader title="Warning" titleIconVariant="warning" />
      <ModalBody>
        <p data-testid="confirmation-modal-text">
          {DEFAULT_DESCRIPTION} {changesCatalog && 'This will also change the current selected catalog.'}
        </p>
        <p>Are you sure you would like to proceed?</p>
      </ModalBody>
      <ModalFooter>
        <Button key="confirm" variant="primary" data-testid="confirmation-modal-confirm" onClick={onConfirm}>
          Confirm
        </Button>
        <Button key="cancel" variant="link" data-testid="confirmation-modal-cancel" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
