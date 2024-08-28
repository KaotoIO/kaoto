import { FunctionComponent, KeyboardEvent, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './XPathEditor.scss';
import { xpathEditorConstrufctionOption, xpathEditorTheme } from './monaco-options';
import { XPathService } from '../../../services/xpath/xpath.service';

type XPathEditorProps = {
  expression: string;
  onChange: (expression: string | undefined) => void;
};

export const XPathEditor: FunctionComponent<XPathEditorProps> = ({ expression, onChange }) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);
  const xpathLanguage = XPathService.getMonacoXPathLanguageMetadata();

  useEffect(() => {
    if (monacoEl) {
      setEditor((editor) => {
        if (editor) return editor;

        monaco.languages.register({ id: xpathLanguage.id });
        monaco.languages.setMonarchTokensProvider(xpathLanguage.id, xpathLanguage.tokensProvider);
        monaco.languages.setLanguageConfiguration(xpathLanguage.id, xpathLanguage.languageConfiguration);
        monaco.languages.registerCompletionItemProvider(xpathLanguage.id, xpathLanguage.completionItemProvider);
        const themeName = 'datamapperTheme';
        monaco.editor.defineTheme(themeName, xpathEditorTheme);

        const newEditor = monaco.editor.create(monacoEl.current!, {
          ...xpathEditorConstrufctionOption,
          theme: themeName,
          value: expression,
        });
        newEditor.onDidChangeModelContent((_e) => onChange(newEditor.getModel()?.getValue()));
        return newEditor;
      });
    }

    return () => editor?.dispose();
  }, [
    editor,
    expression,
    onChange,
    xpathLanguage.completionItemProvider,
    xpathLanguage.id,
    xpathLanguage.languageConfiguration,
    xpathLanguage.tokensProvider,
  ]);

  const handleStopPropagation = useCallback((event: KeyboardEvent | MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <div
      className="xpath-editor"
      onKeyDown={handleStopPropagation}
      onDragStart={handleStopPropagation}
      ref={monacoEl}
    ></div>
  );
};
