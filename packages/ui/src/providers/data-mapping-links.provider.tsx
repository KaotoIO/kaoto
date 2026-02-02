import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useDataMapper } from '../hooks/useDataMapper';
import { IMappingLink } from '../models/datamapper';
import { MappingLinksService } from '../services/mapping-links.service';
import { useDocumentTreeStore } from '../store';

export interface IMappingLinksContext {
  mappingLinkCanvasRef: RefObject<HTMLDivElement | null>;
  getMappingLinks: () => IMappingLink[];
  isNodeInSelectedMapping: (nodePath: string) => boolean;
}

export const MappingLinksContext = createContext<IMappingLinksContext | undefined>(undefined);

export const MappingLinksProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const { mappingTree, sourceParameterMap, sourceBodyDocument } = useDataMapper();
  const [mappingLinks, setMappingLinks] = useState<IMappingLink[]>([]);
  const mappingLinkCanvasRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to store for selection state (needed to recompute mapping links)
  const selectedNodePath = useDocumentTreeStore((state) => state.selectedNodePath);
  const selectedNodeIsSource = useDocumentTreeStore((state) => state.selectedNodeIsSource);

  useEffect(() => {
    const links = MappingLinksService.extractMappingLinks(
      mappingTree,
      sourceParameterMap,
      sourceBodyDocument,
      selectedNodePath,
      selectedNodeIsSource,
    );
    setMappingLinks(links);
  }, [mappingTree, selectedNodePath, selectedNodeIsSource, sourceBodyDocument, sourceParameterMap]);

  const isNodeInSelectedMapping = useCallback(
    (nodePath: string): boolean => {
      if (!selectedNodePath) return false;
      return MappingLinksService.isNodeInSelectedMapping(mappingLinks, nodePath);
    },
    [mappingLinks, selectedNodePath],
  );

  const value = useMemo(() => {
    return {
      mappingLinkCanvasRef,
      getMappingLinks: () => mappingLinks,
      isNodeInSelectedMapping,
    };
  }, [isNodeInSelectedMapping, mappingLinkCanvasRef, mappingLinks]);

  return <MappingLinksContext.Provider value={value}>{children}</MappingLinksContext.Provider>;
};
