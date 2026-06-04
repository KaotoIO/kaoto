import { Monaco } from '@monaco-editor/react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingSerializerService } from '../../../services/mapping/mapping-serializer.service';
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

interface ExportMappingFileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportMappingFileModal: FunctionComponent<ExportMappingFileModalProps> = ({ isOpen, onClose }) => {
  const { mappingTree, sourceParameterMap } = useDataMapper();
  const [serializedMappings, setSerializedMappings] = useState<string>();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    setSerializedMappings(serialized);
  }, [isOpen, mappingTree, sourceParameterMap]);

  const onEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.layout();
    editor.focus();
    monaco.editor.getModels()[0]?.updateOptions({ tabSize: 2 });
  }, []);

  const modalActions = useMemo(() => {
    return [
      <Button key="Close" variant="primary" onClick={onClose} data-testid="dm-debug-export-mappings-modal-close-btn">
        Close
      </Button>,
    ];
  }, [onClose]);

  const editorOptions: IStandaloneEditorConstructionOptions = useMemo(() => {
    return { wordWrap: 'on' };
  }, []);

  return (
    <Modal variant="large" isOpen={isOpen} onClose={onClose} data-testid="dm-debug-export-mappings-modal">
      <ModalHeader title="Exported Mappings" />
      <ModalBody>
        <CodeEditor
          isReadOnly={false}
          isDownloadEnabled={true}
          code={serializedMappings}
          language={Language.xml}
          onEditorDidMount={onEditorDidMount}
          height="sizeToFit"
          width="sizeToFit"
          options={editorOptions}
          data-testid="dm-debug-export-mappings-code-editor"
        />
      </ModalBody>
      <ModalFooter>{modalActions}</ModalFooter>
    </Modal>
  );
};
