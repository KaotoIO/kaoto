import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { Button, Modal, ModalVariant, Tooltip } from '@patternfly/react-core';
import { PenIcon } from '@patternfly/react-icons';
import { useDataMapper, useToggle } from '../../hooks';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { IMapping } from '../../models';
import { MappingSerializerService } from '../../services/mapping-serializer.service';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

type EditXPathButtonProps = {
  mapping: IMapping | null;
};

export const EditXPathButton: FunctionComponent<EditXPathButtonProps> = ({ mapping }) => {
  const { refreshMappings } = useDataMapper();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);
  const [xpath, setXpath] = useState<string | undefined>(mapping?.xpath);
  const allowEditXPath = !!(mapping && (mapping.xpath || mapping.sourceFields[0]));

  const handleEditXPath = useCallback(() => {
    if (!xpath) {
      const emptyXslt = MappingSerializerService.createNew();
      const xpathFromSource = MappingSerializerService.getXPath(emptyXslt, mapping!.sourceFields[0]);
      setXpath(xpathFromSource);
    }
    openModal();
  }, [mapping, openModal, xpath]);

  const handleSubmitXPath = useCallback(() => {
    mapping!.xpath = xpath;
    if (mapping!.sourceFields.length > 0) mapping!.sourceFields = [];
    refreshMappings();
    closeModal();
  }, [closeModal, mapping, refreshMappings, xpath]);

  const onEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.layout();
    editor.focus();
    monaco.editor.getModels()[0].updateOptions({ tabSize: 2 });
  }, []);

  const editorOptions: IStandaloneEditorConstructionOptions = useMemo(() => {
    return { wordWrap: 'on' };
  }, []);

  return (
    <>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Edit XPath expression</div>}>
        <Button
          variant="plain"
          aria-label="Edit XPath expression"
          disabled={allowEditXPath}
          data-testid={`edit-xpath-button`}
          onClick={handleEditXPath}
        >
          <PenIcon />
        </Button>
      </Tooltip>
      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title="Edit XPath"
        actions={[
          <Button key="confirm" variant="primary" onClick={handleSubmitXPath}>
            Confirm
          </Button>,
          <Button key="cancel" variant="link" onClick={closeModal}>
            Cancel
          </Button>,
        ]}
      >
        <CodeEditor
          isReadOnly={false}
          isDownloadEnabled={true}
          code={xpath}
          onCodeChange={(value) => setXpath(value)}
          language={Language.plaintext}
          onEditorDidMount={onEditorDidMount}
          height="sizeToFit"
          width="sizeToFit"
          options={editorOptions}
        />
      </Modal>
    </>
  );
};
