import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { DocumentType } from '../../../models/datamapper/document';
import { MappingService } from '../../../services/mapping/mapping.service';
import { ConfirmActionButton } from './ConfirmActionButton';

type DeleteParameterProps = {
  parameterName: string;
  parameterReferenceId: string;
};

export const DeleteParameterButton: FunctionComponent<DeleteParameterProps> = ({
  parameterName,
  parameterReferenceId,
}) => {
  const { mappingTree, setMappingTree, refreshMappingTree, deleteSourceParameter } = useDataMapper();

  const onConfirmDelete = useCallback(() => {
    const cleaned = MappingService.removeAllMappingsForDocument(mappingTree, DocumentType.PARAM, parameterReferenceId);
    setMappingTree(cleaned);
    deleteSourceParameter(parameterName);
    refreshMappingTree();
  }, [deleteSourceParameter, mappingTree, parameterName, parameterReferenceId, refreshMappingTree, setMappingTree]);

  return (
    <ConfirmActionButton
      icon={<TrashIcon />}
      title="Delete parameter"
      triggerTestId={`delete-parameter-${parameterName}-button`}
      modalTestId="delete-parameter-modal"
      confirmTestId="delete-parameter-modal-confirm-btn"
      cancelTestId="delete-parameter-modal-cancel-btn"
      modalTitle="Delete parameter"
      description={`Delete parameter "${parameterName}"? Related mappings will be also removed.`}
      onConfirm={onConfirmDelete}
    />
  );
};
