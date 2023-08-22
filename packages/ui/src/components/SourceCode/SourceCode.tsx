import { FunctionComponent, PropsWithChildren } from 'react';

interface SourceCodeProps {
  className?: string;
}

export const SourceCode: FunctionComponent<PropsWithChildren<SourceCodeProps>> = () => {
  return <p>SourceCode</p>;
};
