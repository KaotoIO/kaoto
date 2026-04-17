import { Typeahead, TypeaheadItem } from '@kaoto/forms';
import {
  Button,
  Form,
  FormGroup,
  InputGroup,
  InputGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import { FileImportIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { SchemaFile } from './type-override.stub';

export interface ITypeOverrideModalProps {
  isOpen?: boolean;
  fieldPath: string;
  fieldName: string;
  originalType: string;
  isForceOverride?: boolean;
  xmlSchemaTypes?: Array<{ value: string; label: string }>;
  customTypes?: Array<{ value: string; label: string; schemaFile?: string }>;
  onConfirm?: (selectedType: string, isForceOverride: boolean) => void;
  onCancel?: () => void;
  onAttachSchema?: (schema: SchemaFile) => void;
}

export const TypeOverrideModal: FunctionComponent<ITypeOverrideModalProps> = ({
  isOpen = true,
  fieldPath,
  originalType,
  isForceOverride = false,
  xmlSchemaTypes = [],
  customTypes = [],
  onConfirm,
  onCancel,
  onAttachSchema,
}) => {
  const initialTypeSource = xmlSchemaTypes.length > 0 ? 'standard' : customTypes.length > 0 ? 'schema' : 'standard';
  const [typeSource, setTypeSource] = useState<'standard' | 'schema'>(initialTypeSource);
  const [selectedStandardItem, setSelectedStandardItem] = useState<TypeaheadItem | undefined>(
    xmlSchemaTypes.length > 0
      ? { name: xmlSchemaTypes[0].label, value: xmlSchemaTypes[0].value, description: '' }
      : undefined,
  );
  const [selectedCustomItem, setSelectedCustomItem] = useState<TypeaheadItem | undefined>(
    customTypes.length > 0 ? { name: customTypes[0].label, value: customTypes[0].value, description: '' } : undefined,
  );
  const [uploadFileName, setUploadFileName] = useState<string>('');

  const standardTypeItems: TypeaheadItem[] = useMemo(() => {
    return xmlSchemaTypes.map((type) => ({
      name: type.label,
      value: type.value,
      description: '',
    }));
  }, [xmlSchemaTypes]);

  const customTypeItems: TypeaheadItem[] = useMemo(() => {
    return customTypes.map((type) => ({
      name: type.label,
      value: type.value,
      description: '',
    }));
  }, [customTypes]);

  const handleStandardTypeChange = useCallback((item?: TypeaheadItem) => {
    setSelectedStandardItem(item);
  }, []);

  const handleCustomTypeChange = useCallback((item?: TypeaheadItem) => {
    setSelectedCustomItem(item);
  }, []);

  const handleConfirm = () => {
    let selectedType = '';
    if (typeSource === 'standard') {
      selectedType = selectedStandardItem?.value || '';
    } else if (typeSource === 'schema') {
      selectedType = selectedCustomItem?.value || '';
    }

    onConfirm?.(selectedType, isForceOverride);
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xsd,.xml';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        setUploadFileName(file.name);

        const mockSchema: SchemaFile = {
          name: file.name,
          path: `/schemas/${file.name}`,
          types: [
            { value: 'Type1', label: 'Type1' },
            { value: 'Type2', label: 'Type2' },
          ],
        };
        onAttachSchema?.(mockSchema);
      }
    };
    input.click();
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onCancel}>
      <ModalHeader
        title={isForceOverride ? 'Force Override Field Type' : 'Override Field Type'}
        titleIconVariant={isForceOverride ? 'warning' : undefined}
      />
      <ModalBody>
        <Form>
          <FormGroup label="Field Path">
            <p>{fieldPath}</p>
          </FormGroup>

          <FormGroup label="Original Type">
            <p>
              <strong>{originalType}</strong>
            </p>
          </FormGroup>

          <FormGroup label="Select Override Type">
            {xmlSchemaTypes.length > 0 && (
              <Radio
                isChecked={typeSource === 'standard'}
                name="type-source"
                onChange={() => setTypeSource('standard')}
                label="XML Schema standard types"
                id="standard-types"
                body={
                  typeSource === 'standard' && (
                    <Typeahead
                      id="standard-type-select"
                      data-testid="standard-type-select"
                      aria-label="Select standard type"
                      placeholder="Select a type..."
                      selectedItem={selectedStandardItem}
                      onChange={handleStandardTypeChange}
                      items={standardTypeItems}
                    />
                  )
                }
              />
            )}

            {customTypes.length > 0 && (
              <Radio
                isChecked={typeSource === 'schema'}
                name="type-source"
                onChange={() => setTypeSource('schema')}
                label="Types from attached schemas"
                id="schema-types"
                body={
                  typeSource === 'schema' && (
                    <>
                      <Typeahead
                        id="custom-type-select"
                        data-testid="custom-type-select"
                        aria-label="Select type from attached schemas"
                        placeholder="Select a type..."
                        selectedItem={selectedCustomItem}
                        onChange={handleCustomTypeChange}
                        items={customTypeItems}
                      />
                      <FormGroup label="Upload Additional Schema File" style={{ marginTop: '16px' }}>
                        <InputGroup>
                          <InputGroupItem isFill>
                            <TextInput type="text" readOnly value={uploadFileName} placeholder="No file selected" />
                          </InputGroupItem>
                          <InputGroupItem>
                            <Button
                              icon={<FileImportIcon />}
                              onClick={handleFileUpload}
                              aria-label="Upload schema file"
                            />
                          </InputGroupItem>
                        </InputGroup>
                      </FormGroup>
                    </>
                  )
                }
              />
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button key="confirm" variant={isForceOverride ? 'warning' : 'primary'} onClick={handleConfirm}>
          {isForceOverride ? 'Apply Force Override' : 'Apply Override'}
        </Button>
        <Button key="cancel" variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
