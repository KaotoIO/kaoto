import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { FunctionComponent, useMemo } from 'react';

interface IPreview {
  preview: unknown;
  isReadOnly?: boolean;
}

export const Preview: FunctionComponent<IPreview> = ({ preview, isReadOnly = true }) => {
  const code = useMemo(() => {
    let localCode = '';

    try {
      localCode = JSON.stringify(preview, null, 2);
    } catch (error) {
      //
    }

    return localCode;
  }, [preview]);

  return (
    <CodeEditor
      isLineNumbersVisible
      isCopyEnabled
      isLanguageLabelVisible
      isReadOnly={isReadOnly}
      language={Language.json}
      height="100%"
      width="100%"
      code={code}
    />
  );
};
