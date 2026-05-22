import { AlertVariant } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { NameValidation, NameValidationStatus } from '../../models/datamapper/visualization';
import { DocumentService } from '../../services/document/document.service';
import { VisualizationService } from '../../services/visualization/visualization.service';
import { NameInputPlaceholder } from './NameInputPlaceholder';

type ParameterInputPlaceholderProps = {
  onComplete: () => void;
  parameter?: string;
};

export const ParameterInputPlaceholder: FunctionComponent<ParameterInputPlaceholderProps> = ({
  onComplete,
  parameter,
}) => {
  const { sendAlert, sourceParameterMap, renameSourceParameter, updateDocument } = useDataMapper();

  const validate = useCallback(
    (name: string): NameValidation => {
      if (parameter && name === parameter) {
        return { status: NameValidationStatus.SUCCESS };
      }
      return VisualizationService.validateParameterName(name, sourceParameterMap);
    },
    [parameter, sourceParameterMap],
  );

  const handleSubmit = useCallback(
    (name: string) => {
      if (parameter && parameter !== name) {
        // renaming existing parameter
        renameSourceParameter(parameter, name);
      } else if (!sourceParameterMap.has(name)) {
        const result = DocumentService.createPrimitiveDocument(
          DocumentType.PARAM,
          DocumentDefinitionType.Primitive,
          name,
        );

        if (result.validationStatus !== 'success') {
          const variant = result.validationStatus === 'warning' ? AlertVariant.warning : AlertVariant.danger;
          const messages = result.errors ?? result.warnings ?? [];
          sendAlert({ variant: variant, title: messages.map((m) => m.message).join('; ') });
        } else if (!result.documentDefinition || !result.document) {
          sendAlert({ variant: AlertVariant.danger, title: 'Could not create a parameter' });
        } else {
          updateDocument(result.document, result.documentDefinition, name);
        }
      }

      onComplete();
    },
    [parameter, sourceParameterMap, onComplete, renameSourceParameter, sendAlert, updateDocument],
  );

  return (
    <NameInputPlaceholder
      initialName={parameter}
      validate={validate}
      onSubmit={handleSubmit}
      onCancel={onComplete}
      placeholder="parameter name"
      testIdPrefix="new-parameter"
      ariaLabelPrefix="new parameter"
    />
  );
};
