/*
    Copyright (C) 2024 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { FunctionComponent, useMemo } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { CanvasView } from '../../models/datamapper/view';
import { SourceTargetView } from '../View/SourceTargetView';

export const DataMapperControl: FunctionComponent = () => {
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
