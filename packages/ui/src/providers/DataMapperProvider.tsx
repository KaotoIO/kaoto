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
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { useToggle } from '../hooks';

import { Loading } from '../components';
import { CanvasView, IDocument, IMapping, INotification } from '../models';

export interface IDataMapperContext {
  loading: boolean;
  activeView: CanvasView;

  setActiveView(view: CanvasView): void;

  notifications: INotification[];
  constants: IDocument;
  sourceProperties: IDocument;
  targetProperties: IDocument;
  sourceDocuments: IDocument[];
  refreshSourceDocuments: () => void;
  targetDocuments: IDocument[];
  refreshTargetDocuments: () => void;
  mappings: IMapping[];

  setMappings(mappings: IMapping[]): void;

  selectedMapping: IMapping | null;

  setSelectedMapping(mapping: IMapping | null): void;

  isPreviewEnabled: boolean;

  togglePreview(): void;

  showTypes: boolean;

  toggleShowTypes(): void;

  showMappedFields: boolean;

  toggleShowMappedFields(): void;

  showUnmappedFields: boolean;

  toggleShowUnmappedFields(): void;
}

export const DataMapperContext = createContext<IDataMapperContext | null>(null);

export const DataMapperProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<CanvasView>('SourceTarget');
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const { state: isPreviewEnabled, toggle: togglePreview } = useToggle(false);
  const { state: showTypes, toggle: toggleShowTypes } = useToggle(true);
  const { state: showMappedFields, toggle: toggleShowMappedFields } = useToggle(true);
  const { state: showUnmappedFields, toggle: toggleShowUnmappedFields } = useToggle(true);
  const [constants, setConstants] = useState<IDocument>({
    id: 'constants',
    name: 'Constants',
    type: 'constants',
    fields: [],
  } as IDocument);
  const [sourceProperties, setSourceProperties] = useState<IDocument>({
    id: 'sourceProperties',
    name: 'Source Properties',
    type: 'source',
    fields: [],
  });
  const [targetProperties, setTargetProperties] = useState<IDocument>({
    id: 'targetProperties',
    name: 'Target Properties',
    type: 'target',
    fields: [],
  });
  const [sourceDocuments, setSourceDocuments] = useState<IDocument[]>([]);
  const [targetDocuments, setTargetDocuments] = useState<IDocument[]>([]);
  const [mappings, setMappings] = useState<IMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<IMapping | null>(null);

  const refreshSourceDocuments = useCallback(() => {
    setSourceDocuments([...sourceDocuments]);
  }, [sourceDocuments]);
  const refreshTargetDocuments = useCallback(() => {
    setTargetDocuments([...targetDocuments]);
  }, [targetDocuments]);

  const value = useMemo(() => {
    return {
      loading,
      activeView,
      setActiveView,
      notifications,
      constants,
      sourceProperties,
      targetProperties,
      sourceDocuments,
      refreshSourceDocuments,
      targetDocuments,
      refreshTargetDocuments,
      mappings,
      setMappings,
      selectedMapping,
      setSelectedMapping,
      isPreviewEnabled,
      togglePreview,
      showTypes,
      toggleShowTypes,
      showMappedFields,
      toggleShowMappedFields,
      showUnmappedFields,
      toggleShowUnmappedFields,
    };
  }, [
    activeView,
    refreshSourceDocuments,
    refreshTargetDocuments,
    constants,
    isPreviewEnabled,
    loading,
    mappings,
    notifications,
    selectedMapping,
    showMappedFields,
    showTypes,
    showUnmappedFields,
    sourceDocuments,
    sourceProperties,
    targetDocuments,
    targetProperties,
    togglePreview,
    toggleShowMappedFields,
    toggleShowTypes,
    toggleShowUnmappedFields,
  ]);

  return (
    <DataMapperContext.Provider value={value}>
      {value.loading ? <Loading /> : props.children}
    </DataMapperContext.Provider>
  );
};
