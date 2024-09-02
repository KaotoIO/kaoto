import { FunctionComponent, useMemo } from 'react';
import { useDataMapper } from '../hooks';
import { CanvasView } from '../models/view';
import { SourceTargetView } from './views';

export const MainCanvas: FunctionComponent = () => {
  const { activeView } = useDataMapper();
  const currentView = useMemo(() => {
    switch (activeView) {
      case CanvasView.SOURCE_TARGET:
        return <SourceTargetView />;
      default:
        return <>View {activeView} is not supported</>;
    }
  }, [activeView]);

  return <>{currentView}</>;
};
