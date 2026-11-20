import { FunctionComponent } from 'react';

import { SourceCode } from '../../components/SourceCode';
import { useSourceCodeStore } from '../../store';

/**
 * The code of the open document, bound to the source code store.
 *
 * Unlike the Source Code page of the web application, edits keep the path of the document, so the resource type that
 * the host's file name selects (e.g. a Kamelet or a Citrus test) survives typing.
 */
export const RouteSourceCode: FunctionComponent = () => {
  const sourceCode = useSourceCodeStore((state) => state.sourceCode);

  const handleCodeChange = (code: string) => {
    const { path, setCodeAndNotify } = useSourceCodeStore.getState();
    setCodeAndNotify(code, path);
  };

  return <SourceCode code={sourceCode} onCodeChange={handleCodeChange} />;
};
