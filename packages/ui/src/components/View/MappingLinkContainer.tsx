import './MappingLinkContainer.scss';

import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';

import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';
import { MappingLinksService } from '../../services/mapping-links.service';
import { MappingLink } from './MappingLink';

export const MappingLinksContainer: FunctionComponent = () => {
  const [lineCoordList, setLineCoordList] = useState<LineProps[]>([]);
  const { getNodeReference } = useCanvas();
  const { getMappingLinks } = useMappingLinks();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const refreshLinks = useCallback(() => {
    const links = getMappingLinks();
    const answer = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
    setLineCoordList(answer);
  }, [getMappingLinks, getNodeReference]);

  useEffect(() => {
    refreshLinks();
    window.addEventListener('resize', refreshLinks);
    window.addEventListener('scroll', refreshLinks);

    return () => {
      window.removeEventListener('resize', refreshLinks);
      window.removeEventListener('scroll', refreshLinks);
    };
  }, [refreshLinks]);

  return (
    <svg className="mapping-links-container" ref={svgRef} data-testid="mapping-links">
      <g z={0}>
        {lineCoordList.map((lineProps) => (
          <MappingLink
            key={`${lineProps.sourceNodePath}-${lineProps.targetNodePath}`}
            svgRef={svgRef}
            x1={lineProps.x1}
            y1={lineProps.y1}
            x2={lineProps.x2}
            y2={lineProps.y2}
            sourceNodePath={lineProps.sourceNodePath}
            targetNodePath={lineProps.targetNodePath}
            isSelected={lineProps.isSelected}
          />
        ))}
      </g>
    </svg>
  );
};
