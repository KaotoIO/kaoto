import { Monaco } from '@monaco-editor/react';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import { editor } from 'monaco-editor';
import { FunctionComponent, useCallback, useMemo } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingSerializerService } from '../../../services/mapping/mapping-serializer.service';
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

interface ExportMappingFileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportMappingFileModal: FunctionComponent<ExportMappingFileModalProps> = ({ isOpen, onClose }) => {
  const { mappingTree, sourceParameterMap } = useDataMapper();
  const serializedMappings = useMemo(
    () => (isOpen ? MappingSerializerService.serialize(mappingTree, sourceParameterMap) : undefined),
    [isOpen, mappingTree, sourceParameterMap],
  );

  const editorHeight = useMemo(() => {
    const lineCount = serializedMappings?.split('\n').length ?? 0;
    const LINE_HEIGHT = 19;
    const EDITOR_PADDING = 40;
    return `${Math.max(lineCount * LINE_HEIGHT + EDITOR_PADDING, 200)}px`;
  }, [serializedMappings]);

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
          height={editorHeight}
          options={editorOptions}
          data-testid="dm-debug-export-mappings-code-editor"
        />
      </ModalBody>
      <ModalFooter>{modalActions}</ModalFooter>
    </Modal>
  );
};
