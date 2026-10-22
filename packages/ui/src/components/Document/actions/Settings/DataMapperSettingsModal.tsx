import {
  Button,
  Checkbox,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { DocumentDefinitionType, IDataMapperSettings } from '../../../../models/datamapper';
import { DataMapperSettingsService } from '../../../../services/datamapper-settings.service';
import { DataMapperStepService } from '../../../../services/datamapper-step.service';
import { OutputVariableField } from '../../../DataMapper/OutputVariableField';

type DataMapperSettingsModalProps = {
  isModalOpen: boolean;
  onModalClose: () => void;
};

export const DataMapperSettingsModal: FunctionComponent<DataMapperSettingsModalProps> = ({
  isModalOpen,
  onModalClose,
}) => {
  const { dataMapperSettings, updateDataMapperSettings, targetBodyDocument } = useDataMapper();
  const [localOptions, setLocalOptions] = useState<IDataMapperSettings>(dataMapperSettings);
  const [previousSource, setPreviousSource] = useState({ isModalOpen, dataMapperSettings });
  if (previousSource.isModalOpen !== isModalOpen || previousSource.dataMapperSettings !== dataMapperSettings) {
    setPreviousSource({ isModalOpen, dataMapperSettings });
    if (isModalOpen) setLocalOptions(dataMapperSettings);
  }

  const isOmitXmlDeclarationSupported = useMemo(
    () => DataMapperSettingsService.isOmitXmlDeclarationSupported(targetBodyDocument.definitionType),
    [targetBodyDocument.definitionType],
  );

  const isTargetPrimitive = useMemo(
    () => targetBodyDocument.definitionType === DocumentDefinitionType.Primitive,
    [targetBodyDocument.definitionType],
  );
  // Output validation UI: set to true when feature is complete
  const showOutputValidation = true;

  const outputVariable = localOptions.outputVariable ?? '';
  const isSaveDisabled = !!DataMapperStepService.getOutputVariableNameError(outputVariable);

  // Generic handler for any field in IDataMapperSettings
  const handleFieldChange = useCallback(
    <K extends keyof IDataMapperSettings>(field: K, value: IDataMapperSettings[K]) => {
      setLocalOptions((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    updateDataMapperSettings(localOptions);
    onModalClose();
  }, [localOptions, updateDataMapperSettings, onModalClose]);

  const handleCancel = useCallback(() => {
    setLocalOptions(dataMapperSettings);
    onModalClose();
  }, [dataMapperSettings, onModalClose]);

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isModalOpen}
      data-testid="datamapper-settings-modal"
      onClose={handleCancel}
    >
      <ModalHeader title="DataMapper Settings" />
      <ModalBody>
        <Form>
          <FormGroup label="XML Declaration">
            <Checkbox
              id="omit-xml-declaration"
              label="Omit XML declaration"
              isChecked={isOmitXmlDeclarationSupported ? localOptions.omitXmlDeclaration : false}
              onChange={(_event, checked) => {
                handleFieldChange('omitXmlDeclaration', checked);
              }}
              isDisabled={!isOmitXmlDeclarationSupported}
              data-testid="omit-xml-declaration-checkbox"
              description={!isOmitXmlDeclarationSupported ? 'Only available when target document is XML' : undefined}
            />
          </FormGroup>
          {/* Output validation UI: set to true when feature is complete */}
          {showOutputValidation && !isTargetPrimitive && (
            <FormGroup label="Output Validation">
              <Checkbox
                id="validate-output-settings"
                label="Validate output"
                isChecked={localOptions.isOutputValidationEnabled}
                onChange={(_event, checked) => {
                  handleFieldChange('isOutputValidationEnabled', checked);
                }}
                data-testid="validate-output-settings-checkbox"
              />
            </FormGroup>
          )}
          <OutputVariableField
            value={outputVariable}
            onChange={(value) => {
              handleFieldChange('outputVariable', value === '' ? undefined : value);
            }}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          key="save"
          variant="primary"
          data-testid="datamapper-settings-save-btn"
          onClick={handleSave}
          isDisabled={isSaveDisabled}
        >
          Save
        </Button>
        <Button key="cancel" variant="link" data-testid="datamapper-settings-cancel-btn" onClick={handleCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
