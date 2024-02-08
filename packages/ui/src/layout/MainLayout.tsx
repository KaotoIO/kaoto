/*
    Copyright (C) 2017 Red Hat, Inc.

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
import { FunctionComponent, ReactElement, ReactNode, memo, useMemo, useContext } from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { Sidebar } from '../_bk_atlasmap/Layout/Sidebar';
import './MainLayout.css';
import { ContextToolbar, ExpressionToolbar } from '.';
import { MappingTableView, NamespaceTableView } from '../_bk_atlasmap/Views';
import { SourceTargetView } from './views';
import { DataMapperContext } from '../providers';

export interface IMainLayoutProps {
  showSidebar: boolean;
  controlBar?: ReactNode;
  renderSidebar: () => ReactElement;
}

export const MainLayout: FunctionComponent<IMainLayoutProps> = memo(function MainLayout({
  showSidebar,
  renderSidebar,
  controlBar,
}) {
  const sideBar = <Sidebar show={showSidebar}>{renderSidebar}</Sidebar>;
  const containerClasses =
    'pf-topology-container' +
    `${sideBar ? ' pf-topology-container__with-sidebar' : ''}` +
    `${showSidebar ? ' pf-topology-container__with-sidebar--open' : ''}`;
  const { activeView } = useContext(DataMapperContext)!;
  const currentView = useMemo(() => {
    switch (activeView) {
      case 'SourceTarget':
        return <SourceTargetView />;
      case 'MappingTable':
        return (
          <MappingTableView
            mappings={mappings}
            onSelectMapping={selectMapping}
            shouldShowMappingPreview={shouldShowMappingPreview}
            onFieldPreviewChange={onFieldPreviewChange}
          />
        );
      case 'NamespaceTable':
        return (
          <NamespaceTableView
            sources={sources}
            onCreateNamespace={handlers.onCreateNamespace}
            onEditNamespace={(
              docName: string,
              alias: string,
              uri: string,
              locationUri: string,
              targetNamespace: boolean,
            ) =>
              handlers.onEditNamespace(docName, {
                alias,
                uri,
                locationUri,
                targetNamespace,
              })
            }
            onDeleteNamespace={handlers.deleteNamespace}
          />
        );
      default:
        return <>View {activeView} is not supported</>;
    }
  }, [activeView]);

  return (
    <Stack className="view">
      <StackItem isFilled={false}>
        <ContextToolbar />
      </StackItem>
      <StackItem isFilled={false}>
        <ExpressionToolbar />
      </StackItem>
      <StackItem isFilled className={containerClasses}>
        <div className="pf-topology-content">
          {currentView}
          {controlBar && <span className="pf-topology-control-bar">{controlBar}</span>}
        </div>
        {sideBar}
      </StackItem>
    </Stack>
  );
});
