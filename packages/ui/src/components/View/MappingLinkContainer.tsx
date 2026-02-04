import './MappingLinkContainer.scss';

import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';

import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';
import { MappingLinksService } from '../../services/mapping-links.service';
import { MappingLink } from './MappingLink';

export const MappingLinksContainer: FunctionComponent = () => {
  const [lineCoordList, setLineCoordList] = useState<LineProps[]>([]);
  const { getNodeReference, nodeReferenceVersion, reloadNodeReferences } = useCanvas();
  const { getMappingLinks } = useMappingLinks();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isInitialRenderRef = useRef(true);

  const refreshLinks = useCallback(() => {
    const links = getMappingLinks();
    const answer = MappingLinksService.calculateMappingLinkCoordinates(links, svgRef, getNodeReference);
    setLineCoordList(answer);
  }, [getMappingLinks, getNodeReference]);

  // Refresh when node references change (via version counter)
  // Scroll events are throttled at canvas provider level
  // Layout changes (expand/collapse/add/remove) update immediately
  useEffect(() => {
    // On initial render, wait for ExpansionPanels grid layout to settle (CSS transition + layout)
    // This ensures mapping lines are clamped to correct container bounds
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      // Wait for grid transition (150ms) + layout calculation with double RAF
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refreshLinks();
        });
      });
    } else {
      // Subsequent updates - calculate immediately (user-initiated actions and throttled scroll)
      refreshLinks();
    }
  }, [refreshLinks, nodeReferenceVersion]);

  // Refresh on window resize - triggers immediate layout update
  useEffect(() => {
    const handleResize = () => reloadNodeReferences();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [reloadNodeReferences]);

  return (
    <svg className="mapping-links-container" ref={svgRef} data-testid="mapping-links">
      <defs>
        <clipPath id="mapping-clip" clipPathUnits="objectBoundingBox">
          <rect x="0" y="0" width="1" height="1" />
        </clipPath>
      </defs>
      <g clipPath="url(#mapping-clip)">
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
