import './XPathEditor.scss';

import * as monaco from 'monaco-editor';
import { FunctionComponent, useEffect, useRef, useState } from 'react';

import { IExpressionHolder } from '../../models/datamapper';
import { XPathService } from '../../services/xpath/xpath.service';
import { xpathEditorConstrufctionOption, xpathEditorTheme } from './monaco-options';

// Expose monaco on window so Cypress helpers can reach editor instances through
// the standard win.monaco.editor.getEditors() API
if (typeof window !== 'undefined' && 'Cypress' in window) {
  (globalThis as typeof globalThis & { monaco: typeof monaco }).monaco = monaco;
}

type XPathEditorProps = {
  mapping: IExpressionHolder;
  onChange: (expression: string | undefined) => void;
};

export const XPathEditor: FunctionComponent<XPathEditorProps> = ({ mapping, onChange }) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const xpathLanguage = XPathService.getMonacoXPathLanguageMetadata();

  useEffect(() => {
    const previousExpression = editor?.getModel()?.getValue();
    if (previousExpression !== mapping.expression) editor?.getModel()?.setValue(mapping.expression);
  }, [editor, mapping.expression]);

  useEffect(() => {
    if (!monacoEl.current) return;

    monaco.languages.register({ id: xpathLanguage.id });
    monaco.languages.setMonarchTokensProvider(xpathLanguage.id, xpathLanguage.tokensProvider);
    monaco.languages.setLanguageConfiguration(xpathLanguage.id, xpathLanguage.languageConfiguration);
    const completionDisposable = monaco.languages.registerCompletionItemProvider(
      xpathLanguage.id,
      xpathLanguage.completionItemProvider,
    );
    const hoverDisposable = monaco.languages.registerHoverProvider(xpathLanguage.id, xpathLanguage.hoverProvider);
    const themeName = 'datamapperTheme';
    monaco.editor.defineTheme(themeName, xpathEditorTheme);

    const newEditor = monaco.editor.create(monacoEl.current, {
      ...xpathEditorConstrufctionOption,
      theme: themeName,
      value: mapping.expression,
      minimap: {
        enabled: false,
      },
    });
    newEditor.onDidChangeModelContent(() => {
      onChangeRef.current(newEditor.getModel()?.getValue());
    });
    setEditor(newEditor);

    return () => {
      completionDisposable.dispose();
      hoverDisposable.dispose();
      newEditor.dispose();
      setEditor(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="xpath-editor" data-testid="xpath-editor" ref={monacoEl} />;
};
