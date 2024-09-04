import { FunctionComponent, useMemo } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { CanvasView } from '../../models/datamapper/view';
import { SourceTargetView } from '../View/SourceTargetView';

export const DataMapper: FunctionComponent = () => {
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
