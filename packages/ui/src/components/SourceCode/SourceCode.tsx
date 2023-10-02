import { CodeEditor, CodeEditorProps, Language } from '@patternfly/react-code-editor';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { FunctionComponent, Ref, useCallback, useEffect, useMemo, useRef } from 'react';
import { EditorDidMount } from 'react-monaco-editor';
import './SourceCode.scss';
import { SyncButton } from './SyncButton';
import './workers/enable-workers';
import { useEntities } from '../../hooks';
import { entitySchemaConfig } from '../../models/camel-entities/EntitySchemaConfig.ts';

interface SourceCodeProps {
  code: string;
  onCodeChange?: (code: string) => void;
}

export const SourceCode: FunctionComponent<SourceCodeProps> = (props) => {
  const editorRef = useRef<Parameters<EditorDidMount>[0] | null>(null);
  //const schemas = useSchemasStore((state) => state.schemas);
  const { currentEntity } = useEntities();

  useEffect(() => {
    console.log('current entity is ', currentEntity);
    const currentSchema = entitySchemaConfig.config[currentEntity].schema;
    console.log('current schema', currentEntity, currentSchema);
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
  }, [currentEntity]);

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

  const customControls = useMemo(() => {
    return [<SyncButton key="sync-button" isDirty={false} isVisible onClick={() => undefined} />];
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
