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
import { CanvasProvider, FieldDragLayer, FieldsDndProvider, TimedToast } from '../_bk_atlasmap/UI';
import { MainLayout } from '../layout';
import { FunctionComponent, useContext } from 'react';

import { AlertGroup } from '@patternfly/react-core';
import { useDataMapperDialogs } from '../_bk_atlasmap/impl/useDataMapperDialogs';
import { useSidebar } from '../_bk_atlasmap/impl/useSidebar';
import { DataMapperContext } from '../providers';

export interface IDataMapperProps {
  modalsContainerId?: string;
}

export const DataMapper: FunctionComponent<IDataMapperProps> = ({ modalsContainerId = 'modals' }) => {
  const {
    // error,
    notifications,
    sourceProperties,
    targetProperties,
    constants,
    selectedMapping,
    isEnumerationMapping,
  } = useContext(DataMapperContext)!;
  const { handlers, dialogs } = useDataMapperDialogs({
    modalContainer: document.getElementById(modalsContainerId)!,
  });

  const renderSidebar = useSidebar({
    onCreateConstant: () => {
      handlers.onCreateConstant(constants, true);
    },
    onCreateProperty: (isSource: boolean) => {
      if (isSource) {
        handlers.onCreateProperty(isSource, sourceProperties, true);
      } else {
        handlers.onCreateProperty(isSource, targetProperties, true);
      }
    },
    onRemoveMapping: handlers.onDeleteSelectedMapping,
    onEditEnum: handlers.onEditMappingEnumeration,
    isEnumMapping: isEnumerationMapping,
  });

  return (
    <FieldsDndProvider>
      <CanvasProvider>
        <MainLayout showSidebar={!!selectedMapping} renderSidebar={renderSidebar} />
        <FieldDragLayer />
        <AlertGroup isToast>
          {notifications
            .filter((n) => !n.isRead && !n.mappingId)
            .slice(0, 5)
            .map(({ id, variant, title, description }) => (
              <TimedToast variant={variant} title={title} key={id} onClose={() => {}} onTimeout={() => {}}>
                {description}
              </TimedToast>
            ))}
        </AlertGroup>
        {dialogs}
      </CanvasProvider>
    </FieldsDndProvider>
  );
};
