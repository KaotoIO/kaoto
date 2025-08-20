import { FunctionComponent, useEffect, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';
import { MappingLinksService } from '../../services/mapping-links.service';
import { MappingLink } from './MappingLink';
import './MappingLinksContainer.scss';

export const MappingLinksContainer: FunctionComponent = () => {
  const [lineCoordList, setLineCoordList] = useState<LineProps[]>([]);
  const { getNodeReference } = useCanvas();
  const { getMappingLinks } = useMappingLinks();
  const svgRef = useRef<SVGSVGElement>(null);

  const refreshLinks = () => {
    const links = getMappingLinks();
    const answer = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
    setLineCoordList(answer);
  };

  useEffect(() => {
    refreshLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMappingLinks, getNodeReference]); // Refresh when dependencies change

  useEffect(() => {
    // These don't need to be removed/re-added constantly
    window.addEventListener('resize', refreshLinks);
    window.addEventListener('scroll', refreshLinks);

    return () => {
      window.removeEventListener('resize', refreshLinks);
      window.removeEventListener('scroll', refreshLinks);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set up once

  return (
    <svg ref={svgRef} data-testid="mapping-links" className="mapping-links-container">
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
