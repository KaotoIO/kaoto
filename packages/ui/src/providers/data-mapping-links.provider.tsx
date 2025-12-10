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
import { IMappingLink, NodeReference } from '../models/datamapper';
import { MappingLinksService } from '../services/mapping-links.service';

export interface IMappingLinksContext {
  mappingLinkCanvasRef: RefObject<HTMLDivElement | null>;
  getMappingLinks: () => IMappingLink[];
  getSelectedNodeReference: () => RefObject<NodeReference> | null;
  setSelectedNodeReference: (ref: RefObject<NodeReference> | null) => void;
  toggleSelectedNodeReference: (ref: RefObject<NodeReference> | null) => void;
  isInSelectedMapping: (ref: RefObject<NodeReference>) => boolean;
}

export const MappingLinksContext = createContext<IMappingLinksContext | undefined>(undefined);

export const MappingLinksProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const { mappingTree, sourceParameterMap, sourceBodyDocument } = useDataMapper();
  const [mappingLinks, setMappingLinks] = useState<IMappingLink[]>([]);
  const [selectedNodeRef, setSelectedNodeRef] = useState<RefObject<NodeReference> | null>(null);
  const mappingLinkCanvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const links = MappingLinksService.extractMappingLinks(
      mappingTree,
      sourceParameterMap,
      sourceBodyDocument,
      selectedNodeRef,
    );
    setMappingLinks(links);
  }, [mappingTree, selectedNodeRef, sourceBodyDocument, sourceParameterMap]);

  const toggleSelectedNodeReference = useCallback(
    (ref: RefObject<NodeReference> | null) => {
      setSelectedNodeRef(ref === selectedNodeRef ? null : ref);
    },
    [selectedNodeRef],
  );

  const isInSelectedMapping = useCallback(
    (ref: RefObject<NodeReference>): boolean =>
      selectedNodeRef === ref || MappingLinksService.isInSelectedMapping(mappingLinks, ref),
    [mappingLinks, selectedNodeRef],
  );

  const value = useMemo(() => {
    return {
      mappingLinkCanvasRef,
      getMappingLinks: () => mappingLinks,
      getSelectedNodeReference: () => selectedNodeRef,
      setSelectedNodeReference: setSelectedNodeRef,
      toggleSelectedNodeReference,
      isInSelectedMapping,
    };
  }, [isInSelectedMapping, mappingLinkCanvasRef, mappingLinks, selectedNodeRef, toggleSelectedNodeReference]);

  return <MappingLinksContext.Provider value={value}>{children}</MappingLinksContext.Provider>;
};
