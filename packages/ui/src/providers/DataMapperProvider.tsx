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

import { Loading } from '../components/Loading';
import { CanvasView, IDocument, IMapping } from '../models';

export interface IDataMapperContext {
  loading: boolean;
  activeView: CanvasView;
  setActiveView(view: CanvasView): void;

  sourceDocuments: IDocument[];
  refreshSourceDocuments: () => void;
  targetDocuments: IDocument[];
  refreshTargetDocuments: () => void;

  mappings: IMapping[];
  refreshMappings(): void;

  selectedMapping: IMapping | null;
  setSelectedMapping(mapping: IMapping | null): void;
}

export const DataMapperContext = createContext<IDataMapperContext | null>(null);

export const DataMapperProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [loading, _setLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<CanvasView>(CanvasView.SOURCE_TARGET);
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

  const refreshMappings = useCallback(() => {
    setMappings([...mappings]);
  }, [mappings]);

  const value = useMemo(() => {
    return {
      loading,
      activeView,
      setActiveView,
      sourceDocuments,
      refreshSourceDocuments,
      targetDocuments,
      refreshTargetDocuments,
      mappings,
      refreshMappings,
      selectedMapping,
      setSelectedMapping,
    };
  }, [
    activeView,
    refreshSourceDocuments,
    refreshTargetDocuments,
    loading,
    mappings,
    refreshMappings,
    selectedMapping,
    sourceDocuments,
    targetDocuments,
  ]);

  return (
    <DataMapperContext.Provider value={value}>
      {value.loading ? <Loading /> : props.children}
    </DataMapperContext.Provider>
  );
};
