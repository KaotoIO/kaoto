import './MappingLinkContainer.scss';

import { FunctionComponent, useRef as useReactRef } from 'react';

import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';
import { useDocumentTreeStore } from '../../store';
import { getNearestVisiblePort } from '../../utils';
import { MappingLink } from './MappingLink';

const sortMappingLines = (a: LineProps, b: LineProps): 0 | 1 | -1 => {
  // Selected lines should be drawn last (on top)
  if (a.isSelected && !b.isSelected) return 1;
  if (!a.isSelected && b.isSelected) return -1;
  return 0;
};

export const MappingLinksContainer: FunctionComponent = () => {
  const nodesConnectionPorts = useDocumentTreeStore((state) => state.nodesConnectionPorts);
  const expansionState = useDocumentTreeStore((state) => state.expansionState);
  const connectionPortVersion = useDocumentTreeStore((state) => state.connectionPortVersion);

  const { getMappingLinks } = useMappingLinks();
  const svgRef = useReactRef<SVGSVGElement | null>(null);
  const mappingLinks = getMappingLinks();

  // Get SVG container offset to convert absolute coordinates to relative
  // Force recalculation when connectionPortVersion changes
  const svgRect = svgRef.current?.getBoundingClientRect();
  const svgOffsetLeft = svgRect?.left ?? 0;
  const svgOffsetTop = svgRect?.top ?? 0;

  // Calculate line coordinates from mapping links and connection ports
  const lineCoordList: LineProps[] = mappingLinks
    .map(({ sourceNodePath, targetNodePath, isSelected }) => {
      const sourcePort = getNearestVisiblePort(sourceNodePath, nodesConnectionPorts, expansionState);
      const targetPort = getNearestVisiblePort(targetNodePath, nodesConnectionPorts, expansionState);

      // Only create line if both ports exist
      if (!sourcePort || !targetPort) {
        return null;
      }

      // Convert absolute screen coordinates to SVG-relative coordinates
      return {
        x1: sourcePort[0] - svgOffsetLeft,
        y1: sourcePort[1] - svgOffsetTop,
        x2: targetPort[0] - svgOffsetLeft,
        y2: targetPort[1] - svgOffsetTop,
        sourceNodePath,
        targetNodePath,
        isSelected,
      } as LineProps;
    })
    .filter((line): line is LineProps => line !== null)
    .sort(sortMappingLines);

  return (
    <svg
      className="mapping-links-container"
      ref={svgRef}
      data-testid="mapping-links"
      data-connection-port-version={connectionPortVersion}
    >
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
