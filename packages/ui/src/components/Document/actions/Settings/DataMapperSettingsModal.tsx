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
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { DocumentDefinitionType, IDataMapperSettings } from '../../../../models/datamapper';

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

  const isTargetXml = useMemo(
    () => targetBodyDocument.definitionType === DocumentDefinitionType.XML_SCHEMA,
    [targetBodyDocument.definitionType],
  );

  // Sync local state with context when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setLocalOptions(dataMapperSettings);
    }
  }, [isModalOpen, dataMapperSettings]);

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
              isChecked={isTargetXml ? localOptions.omitXmlDeclaration : false}
              onChange={(_event, checked) => {
                handleFieldChange('omitXmlDeclaration', checked);
              }}
              isDisabled={!isTargetXml}
              data-testid="omit-xml-declaration-checkbox"
              description={!isTargetXml ? 'Only available when target document is XML' : undefined}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button key="save" variant="primary" data-testid="datamapper-settings-save-btn" onClick={handleSave}>
          Save
        </Button>
        <Button key="cancel" variant="link" data-testid="datamapper-settings-cancel-btn" onClick={handleCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
