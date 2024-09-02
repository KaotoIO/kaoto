import { Button, DropdownItem, Modal } from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { ExportIcon } from '@patternfly/react-icons';
import { MappingSerializerService } from '../../services/mapping-serializer.service';
import { useDataMapper } from '../../hooks';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

export const ExportMappingFileDropdownItem: FunctionComponent<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const { mappingTree, sourceParameterMap } = useDataMapper();
  const [isModalOpen, setIsModalOpen] = useState<boolean>();
  const [serializedMappings, setSerializedMappings] = useState<string>();

  const handleMenuClick = useCallback(() => {
    const serialized = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
    setSerializedMappings(serialized);
    setIsModalOpen(true);
  }, [mappingTree, sourceParameterMap]);

  const handleModalClose = useCallback(() => {
    setSerializedMappings('');
    setIsModalOpen(false);
    onComplete();
  }, [onComplete]);

  const onEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.layout();
    editor.focus();
    monaco.editor.getModels()[0].updateOptions({ tabSize: 2 });
  }, []);

  const modalActions = useMemo(() => {
    return [
      <Button key="Close" variant="primary" onClick={handleModalClose} data-testid="export-mappings-modal-close-btn">
        Close
      </Button>,
    ];
  }, [handleModalClose]);

  const editorOptions: IStandaloneEditorConstructionOptions = useMemo(() => {
    return { wordWrap: 'on' };
  }, []);

  return (
    <>
      <DropdownItem icon={<ExportIcon />} onClick={handleMenuClick} data-testid="export-mappings-button">
        Export current mappings (.xsl)
      </DropdownItem>
      <Modal
        variant="large"
        title="Exported Mappings"
        isOpen={isModalOpen}
        onClose={() => handleModalClose()}
        actions={modalActions}
        data-testid="export-mappings-modal"
      >
        <CodeEditor
          isReadOnly={false}
          isDownloadEnabled={true}
          code={serializedMappings}
          language={Language.xml}
          onEditorDidMount={onEditorDidMount}
          height="sizeToFit"
          width="sizeToFit"
          options={editorOptions}
          data-testid="export-mappings-code-editor"
        />
      </Modal>
    </>
  );
};
