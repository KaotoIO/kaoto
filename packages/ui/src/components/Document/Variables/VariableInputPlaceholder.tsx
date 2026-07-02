import './VariableInputPlaceholder.scss';

import { FunctionComponent, useCallback } from 'react';

import { MappingParentType } from '../../../models/datamapper/mapping';
import { NameValidation, NameValidationStatus } from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { NameInputPlaceholder } from '../NameInputPlaceholder';

type VariableInputPlaceholderProps = {
  initialName?: string;
  parent: MappingParentType;
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export const VariableInputPlaceholder: FunctionComponent<VariableInputPlaceholderProps> = ({
  initialName,
  parent,
  onConfirm,
  onCancel,
}) => {
  const validate = useCallback(
    (name: string): NameValidation => {
      if (initialName && name === initialName) {
        return { status: NameValidationStatus.SUCCESS };
      }
      return VisualizationService.validateVariableName(name, parent);
    },
    [initialName, parent],
  );

  const handleSubmit = useCallback(
    (name: string) => {
      if (initialName && name === initialName) {
        onCancel();
        return;
      }
      onConfirm(name);
    },
    [initialName, onConfirm, onCancel],
  );

  return (
    <div className="variable-input-placeholder">
      <NameInputPlaceholder
        initialName={initialName}
        validate={validate}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        placeholder="variable name"
        testIdPrefix="new-variable"
        ariaLabelPrefix="variable name"
        label="$"
      />
    </div>
  );
};
