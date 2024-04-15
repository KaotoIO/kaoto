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
import { CanvasView, DocumentType, IDocument, IMapping, PrimitiveDocument } from '../models';

export interface IDataMapperContext {
  loading: boolean;
  activeView: CanvasView;
  setActiveView(view: CanvasView): void;

  sourceParameterMap: Map<string, IDocument>;
  refreshSourceParameters: () => void;
  sourceBodyDocument: IDocument;
  setSourceBodyDocument: (doc: IDocument) => void;
  targetBodyDocument: IDocument;
  setTargetBodyDocument: (doc: IDocument) => void;

  mappings: IMapping[];
  refreshMappings(): void;
  setMappings(mappings: IMapping[]): void;
  selectedMapping: IMapping | null;
  setSelectedMapping(mapping: IMapping | null): void;

  debug: boolean;
  setDebug(debug: boolean): void;
}

export const DataMapperContext = createContext<IDataMapperContext | null>(null);

export const DataMapperProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [loading, _setLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<CanvasView>(CanvasView.SOURCE_TARGET);
  const [sourceParameterMap, setSourceParameterMap] = useState<Map<string, IDocument>>(new Map<string, IDocument>());
  const [sourceBodyDocument, setSourceBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(DocumentType.SOURCE_BODY, 'Body'),
  );
  const [targetBodyDocument, setTargetBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(DocumentType.TARGET_BODY, 'Body'),
  );
  const [mappings, setMappings] = useState<IMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<IMapping | null>(null);
  const [debug, setDebug] = useState<boolean>(false);

  const refreshSourceParameters = useCallback(() => {
    setSourceParameterMap(new Map(sourceParameterMap));
  }, [sourceParameterMap]);

  const refreshMappings = useCallback(() => {
    setMappings([...mappings]);
  }, [mappings]);

  const value = useMemo(() => {
    return {
      loading,
      activeView,
      setActiveView,
      sourceParameterMap,
      refreshSourceParameters,
      sourceBodyDocument,
      setSourceBodyDocument,
      targetBodyDocument,
      setTargetBodyDocument,
      mappings,
      refreshMappings,
      setMappings,
      selectedMapping,
      setSelectedMapping,
      debug,
      setDebug,
    };
  }, [
    activeView,
    refreshSourceParameters,
    loading,
    mappings,
    refreshMappings,
    selectedMapping,
    sourceParameterMap,
    sourceBodyDocument,
    setSourceBodyDocument,
    targetBodyDocument,
    setTargetBodyDocument,
    debug,
    setDebug,
  ]);

  return (
    <DataMapperContext.Provider value={value}>
      {value.loading ? <Loading /> : props.children}
    </DataMapperContext.Provider>
  );
};
