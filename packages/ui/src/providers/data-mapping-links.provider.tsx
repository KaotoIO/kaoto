import {
  createContext,
  FunctionComponent,
  MutableRefObject,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { IMappingLink, NodeReference } from '../models/datamapper';
import { useDataMapper } from '../hooks/useDataMapper';
import { MappingLinksService } from '../services/mapping-links.service';

export interface IMappingLinksContext {
  mappingLinkCanvasRef: RefObject<HTMLDivElement> | null;
  setMappingLinkCanvasRef: (ref: RefObject<HTMLDivElement>) => void;
  getMappingLinks: () => IMappingLink[];
  getSelectedNodeReference: () => MutableRefObject<NodeReference> | null;
  setSelectedNodeReference: (ref: MutableRefObject<NodeReference> | null) => void;
  toggleSelectedNodeReference: (ref: MutableRefObject<NodeReference> | null) => void;
  isInSelectedMapping: (ref: MutableRefObject<NodeReference>) => boolean;
}

export const MappingLinksContext = createContext<IMappingLinksContext | undefined>(undefined);

export const MappingLinksProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const { mappingTree, sourceParameterMap, sourceBodyDocument } = useDataMapper();
  const [mappingLinkCanvasRef, setMappingLinkCanvasRef] = useState<RefObject<HTMLDivElement> | null>(null);
  const [mappingLinks, setMappingLinks] = useState<IMappingLink[]>([]);
  const [selectedNodeRef, setSelectedNodeRef] = useState<MutableRefObject<NodeReference> | null>(null);

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
    (ref: MutableRefObject<NodeReference> | null) => {
      setSelectedNodeRef(ref !== selectedNodeRef ? ref : null);
    },
    [selectedNodeRef],
  );

  const isInSelectedMapping = useCallback(
    (ref: MutableRefObject<NodeReference>): boolean =>
      selectedNodeRef === ref || MappingLinksService.isInSelectedMapping(mappingLinks, ref),
    [mappingLinks, selectedNodeRef],
  );

  const value = useMemo(() => {
    return {
      mappingLinkCanvasRef,
      setMappingLinkCanvasRef,
      getMappingLinks: () => mappingLinks,
      getSelectedNodeReference: () => selectedNodeRef,
      setSelectedNodeReference: setSelectedNodeRef,
      toggleSelectedNodeReference,
      isInSelectedMapping,
    };
  }, [isInSelectedMapping, mappingLinkCanvasRef, mappingLinks, selectedNodeRef, toggleSelectedNodeReference]);

  return <MappingLinksContext.Provider value={value}>{children}</MappingLinksContext.Provider>;
};
