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
import { MappingTree } from '../models/mapping';
import { BODY_DOCUMENT_ID, IDocument, PrimitiveDocument } from '../models/document';
import { CanvasView } from '../models/view';
import { DocumentType } from '../models/path';
import { MappingSerializerService } from '../services/mapping-serializer.service';

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

  mappingTree: MappingTree;
  refreshMappingTree(): void;
  setMappingTree(mappings: MappingTree): void;

  debug: boolean;
  setDebug(debug: boolean): void;
}

export const DataMapperContext = createContext<IDataMapperContext | null>(null);

type DataMapperProviderProps = PropsWithChildren & {
  xsltFile?: string;
  onUpdate?: (xsltFile: string) => void;
};

export const DataMapperProvider: FunctionComponent<DataMapperProviderProps> = ({ xsltFile, onUpdate, children }) => {
  const [loading, _setLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<CanvasView>(CanvasView.SOURCE_TARGET);
  const [sourceParameterMap, setSourceParameterMap] = useState<Map<string, IDocument>>(new Map<string, IDocument>());
  const [sourceBodyDocument, setSourceBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID),
  );
  const [targetBodyDocument, setTargetBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID),
  );
  const [mappingTree, setMappingTree] = useState<MappingTree>(
    new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID),
  );
  xsltFile && MappingSerializerService.deserialize(xsltFile, targetBodyDocument, mappingTree, sourceParameterMap);
  const [debug, setDebug] = useState<boolean>(false);

  const refreshSourceParameters = useCallback(() => {
    setSourceParameterMap(new Map(sourceParameterMap));
  }, [sourceParameterMap]);

  const refreshMappingTree = useCallback(() => {
    const newMapping = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    newMapping.children = mappingTree.children.map((child) => {
      child.parent = newMapping;
      return child;
    });
    newMapping.namespaceMap = mappingTree.namespaceMap;
    setMappingTree(newMapping);
    onUpdate && onUpdate(MappingSerializerService.serialize(mappingTree, sourceParameterMap));
  }, [mappingTree, onUpdate, sourceParameterMap]);

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
      mappingTree,
      refreshMappingTree,
      setMappingTree,
      debug,
      setDebug,
    };
  }, [
    activeView,
    refreshSourceParameters,
    loading,
    mappingTree,
    refreshMappingTree,
    sourceParameterMap,
    sourceBodyDocument,
    setSourceBodyDocument,
    targetBodyDocument,
    setTargetBodyDocument,
    debug,
    setDebug,
  ]);

  return (
    <DataMapperContext.Provider value={value}>{value.loading ? <Loading /> : children}</DataMapperContext.Provider>
  );
};
