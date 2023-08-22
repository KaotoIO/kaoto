import { FunctionComponent, PropsWithChildren } from 'react';

interface CanvasProps {
  className?: string;
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = () => {
  return <p>Canvas</p>;
};
