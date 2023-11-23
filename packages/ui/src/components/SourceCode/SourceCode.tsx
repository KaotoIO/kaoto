import { CodeEditor, CodeEditorProps, Language } from '@patternfly/react-code-editor';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { FunctionComponent, Ref, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { EditorDidMount } from 'react-monaco-editor';
import './SourceCode.scss';
import { SyncButton } from './SyncButton';
import './workers/enable-workers';
import { sourceSchemaConfig, SourceSchemaType } from '../../models/camel';
import { EntitiesContext } from '../../providers/entities.provider';
import { UndoButton } from './UndoButton';
import { RedoButton } from './RedoButton';

interface SourceCodeProps {
  code: string;
  onCodeChange?: (code: string) => void;
}

export const SourceCode: FunctionComponent<SourceCodeProps> = (props) => {
  const editorRef = useRef<Parameters<EditorDidMount>[0] | null>(null);
  const entityContext = useContext(EntitiesContext);

  useEffect(() => {
    const schemaType: SourceSchemaType = entityContext?.currentSchemaType ?? SourceSchemaType.Route;
    const currentSchema = sourceSchemaConfig.config[schemaType].schema;
    if (currentSchema) {
      setDiagnosticsOptions({
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        validate: true,
        format: true,
        schemas: [
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            schema: currentSchema.schema as any,
            uri: currentSchema.uri,
            fileMatch: ['*'],
          },
        ],
      });
    }
  }, [entityContext?.currentSchemaType]);

  const handleEditorDidMount: EditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
    editor?.layout();
    editor?.revealLineInCenterIfOutsideViewport(editor.getModel()?.getLineCount() ?? 0);
    editor?.focus();
  }, []);

  const options: Ref<CodeEditorProps['options']> = useRef({
    selectOnLineNumbers: true,
    readOnly: false,
    scrollbar: {
      horizontal: 'visible',
      vertical: 'visible',
    },
    quickSuggestions: { other: true, strings: true, comments: true },
  });

  const undoAction = () => {
    (editorRef.current?.getModel() as any)?.undo();
  }

  const redoAction = () => {
    (editorRef.current?.getModel() as any)?.redo();
  }

  const customControls = useMemo(() => {
    return [
      <UndoButton key="undo-button" isVisible onClick={() => undoAction} />,
      <RedoButton key="redo-button" isVisible onClick={() => redoAction} />,
      <SyncButton key="sync-button" isDirty={false} isVisible onClick={() => undefined} />,
    ];
  }, []);

  return (
    <CodeEditor
      className="source-code-editor"
      /** 100% is being set but it doesn't work properly, we need to set a fixed height */
      height="90vh"
      width="100%"
      isCopyEnabled
      isDownloadEnabled
      isLanguageLabelVisible
      allowFullScreen
      isUploadEnabled
      toolTipPosition="top"
      code={props.code}
      onCodeChange={props.onCodeChange}
      customControls={customControls}
      language={Language.yaml}
      options={options.current!}
      onEditorDidMount={handleEditorDidMount}
    />
  );
};
