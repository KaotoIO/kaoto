import { FunctionComponent, PropsWithChildren } from 'react';
import './Visualization.scss';

interface CanvasProps {
  className?: string;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  return <div className={`canvasSurface ${props.className ?? ''}`}>Visualization</div>;
};
