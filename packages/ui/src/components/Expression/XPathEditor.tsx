import { FunctionComponent, useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './XPathEditor.scss';
import { xpathEditorConstrufctionOption, xpathEditorTheme } from './monaco-options';
import { XPathService } from '../../services/xpath/xpath.service';
import { ExpressionItem } from '../../models/datamapper';

type XPathEditorProps = {
  mapping: ExpressionItem;
  onChange: (expression: string | undefined) => void;
};

export const XPathEditor: FunctionComponent<XPathEditorProps> = ({ mapping, onChange }) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);
  const xpathLanguage = XPathService.getMonacoXPathLanguageMetadata();

  useEffect(() => {
    const previousExpression = editor?.getModel()?.getValue();
    if (previousExpression !== mapping.expression) editor?.getModel()?.setValue(mapping.expression);
  }, [editor, mapping.expression]);

  useEffect(() => {
    if (monacoEl) {
      setEditor((editor) => {
        if (editor) return editor;

        monaco.languages.register({ id: xpathLanguage.id });
        monaco.languages.setMonarchTokensProvider(xpathLanguage.id, xpathLanguage.tokensProvider);
        monaco.languages.setLanguageConfiguration(xpathLanguage.id, xpathLanguage.languageConfiguration);
        monaco.languages.registerCompletionItemProvider(xpathLanguage.id, xpathLanguage.completionItemProvider);
        monaco.languages.registerHoverProvider(xpathLanguage.id, {
          provideHover: (model, position, token, context) => {
            console.log(`#### ${model}, ${position}, ${token}, ${context}`);
            return { contents: [{ value: 'test' }] };
          },
        });
        const themeName = 'datamapperTheme';
        monaco.editor.defineTheme(themeName, xpathEditorTheme);

        const newEditor = monaco.editor.create(monacoEl.current!, {
          ...xpathEditorConstrufctionOption,
          theme: themeName,
          value: mapping.expression,
        });
        newEditor.onDidChangeModelContent((_e) => onChange(newEditor.getModel()?.getValue()));
        const model = newEditor.getModel();
        console.log(`##### ${model?.getLanguageId()}`);
        return newEditor;
      });
    }

    return () => {
      if (!monacoEl) {
        editor?.dispose();
        setEditor(null);
      }
    };
  }, [
    editor,
    mapping.expression,
    onChange,
    xpathLanguage.completionItemProvider,
    xpathLanguage.id,
    xpathLanguage.languageConfiguration,
    xpathLanguage.tokensProvider,
  ]);

  return <div className="xpath-editor" ref={monacoEl}></div>;
};
