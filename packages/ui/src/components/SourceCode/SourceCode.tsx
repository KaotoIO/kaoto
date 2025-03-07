import { CodeEditor, CodeEditorProps, Language } from '@patternfly/react-code-editor';
import { configureMonacoYaml, JSONSchema } from 'monaco-yaml';
import { FunctionComponent, MutableRefObject, Ref, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { EditorDidMount } from 'react-monaco-editor';
import { sourceSchemaConfig, SourceSchemaType } from '../../models/camel';
import { EntitiesContext } from '../../providers/entities.provider';
import { RedoButton } from './RedoButton';
import './SourceCode.scss';
import { UndoButton } from './UndoButton';
import './workers/enable-workers';
import { isXML } from '../../serializers/xml/kaoto-xml-parser';

interface SourceCodeProps {
  code: string;
  onCodeChange?: (code: string) => void;
}

const options: CodeEditorProps['options'] = {
  selectOnLineNumbers: true,
  readOnly: false,
  scrollbar: {
    horizontal: 'visible',
    vertical: 'visible',
  },
  quickSuggestions: { other: true, strings: true, comments: true },
};

export const SourceCode: FunctionComponent<SourceCodeProps> = (props) => {
  const editorRef = useRef<Parameters<EditorDidMount>[0] | null>(null);
  const entityContext = useContext(EntitiesContext);
  const schemaType: SourceSchemaType = entityContext?.currentSchemaType ?? SourceSchemaType.Route;
  const currentSchema = sourceSchemaConfig.config[schemaType].schema;
  const monacoYamlHandlerRef: MutableRefObject<ReturnType<typeof configureMonacoYaml> | undefined> = useRef(undefined);

  const editorProps: Ref<CodeEditorProps['editorProps']> = useRef({
    beforeMount: (monaco) => {
      if (currentSchema) {
        const monacoYamlHandler = configureMonacoYaml(monaco, {
          enableSchemaRequest: true,
          hover: true,
          completion: true,
          validate: true,
          format: true,
          schemas: [
            {
              schema: currentSchema.schema as JSONSchema,
              uri: currentSchema.uri,
              fileMatch: ['*'],
            },
          ],
        });

        /** Capturing the monacoYamlHandlerRef so we can dispose it when unmounting this component */
        monacoYamlHandlerRef.current = monacoYamlHandler;
      }
    },
  });

  const handleEditorDidMount: EditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
    editor?.layout();
    editor?.revealLineInCenterIfOutsideViewport(editor.getModel()?.getLineCount() ?? 0);
    editor?.focus();
  }, []);

  const undoAction = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editorRef.current?.getModel() as any)?.undo();
  };

  const redoAction = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editorRef.current?.getModel() as any)?.redo();
  };

  const customControls = useMemo(() => {
    return [
      <UndoButton key="undo-button" isVisible onClick={undoAction} />,
      <RedoButton key="redo-button" isVisible onClick={redoAction} />,
    ];
  }, []);

  useEffect(() => {
    /**
     * This useEffect acts as an unmount hook for the CodeEditor component
     * It disposes the monacoYamlHandlerRef.current when the component is unmounted
     */
    return () => {
      monacoYamlHandlerRef.current?.dispose();
    };
  }, []);

  return (
    <CodeEditor
      className="source-code-editor"
      isFullHeight
      isCopyEnabled
      isDownloadEnabled
      isLanguageLabelVisible
      isUploadEnabled
      toolTipPosition="top"
      code={props.code}
      onCodeChange={props.onCodeChange}
      customControls={customControls}
      language={isXML(props.code) ? Language.xml : Language.yaml}
      editorProps={editorProps.current!}
      options={options}
      onEditorDidMount={handleEditorDidMount}
    />
  );
};
