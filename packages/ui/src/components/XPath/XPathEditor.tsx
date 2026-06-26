import './XPathEditor.scss';

import * as monaco from 'monaco-editor';
import { FunctionComponent, useEffect, useRef, useState } from 'react';

import { IExpressionHolder } from '../../models/datamapper';
import { monacoXPathLanguageMetadata } from '../../services/xpath/monaco-language';
import { XPathService } from '../../services/xpath/xpath.service';
import { xpathEditorConstrufctionOption, xpathEditorTheme } from './monaco-options';

type XPathEditorProps = {
  mapping: IExpressionHolder;
  onChange: (expression: string | undefined) => void;
};

export const XPathEditor: FunctionComponent<XPathEditorProps> = ({ mapping, onChange }) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const previousExpression = editor?.getModel()?.getValue();
    if (previousExpression !== mapping.expression) editor?.getModel()?.setValue(mapping.expression);
  }, [editor, mapping.expression]);

  useEffect(() => {
    if (!monacoEl.current || editorRef.current) return;

    const xpathLanguage = monacoXPathLanguageMetadata;
    monaco.languages.register({ id: xpathLanguage.id });
    monaco.languages.setMonarchTokensProvider(xpathLanguage.id, xpathLanguage.tokensProvider);
    monaco.languages.setLanguageConfiguration(xpathLanguage.id, xpathLanguage.languageConfiguration);
    monaco.languages.registerCompletionItemProvider(xpathLanguage.id, xpathLanguage.completionItemProvider);
    const themeName = 'datamapperTheme';
    monaco.editor.defineTheme(themeName, xpathEditorTheme);

    const newEditor = monaco.editor.create(monacoEl.current!, {
      ...xpathEditorConstrufctionOption,
      theme: themeName,
      value: mapping.expression,
      minimap: {
        enabled: false,
      },
    });
    newEditor.onDidChangeModelContent((_e) => onChangeRef.current(newEditor.getModel()?.getValue()));
    editorRef.current = newEditor;
    setEditor(newEditor);

    XPathService.getMonacoXPathLanguageMetadata()
      .then((metadata) => {
        monaco.languages.setMonarchTokensProvider(metadata.id, metadata.tokensProvider);
      })
      .catch(() => {});

    return () => {
      editorRef.current?.dispose();
      editorRef.current = null;
      setEditor(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="xpath-editor" data-testid="xpath-editor" ref={monacoEl}></div>;
};
