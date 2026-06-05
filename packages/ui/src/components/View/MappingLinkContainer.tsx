import './MappingLinkContainer.scss';

import { FunctionComponent, useRef as useReactRef } from 'react';

import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps, MappingLineStyle } from '../../models/datamapper';
import { useDocumentTreeStore } from '../../store';
import { getNearestVisiblePort } from '../../utils';
import { MappingLink } from './MappingLink';

const deduplicateByCoords = () => {
  const seen = new Set<string>();
  return (line: LineProps | null): line is LineProps => {
    if (line === null) return false;
    const key = `${line.x1},${line.y1},${line.x2},${line.y2}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
};

const sortMappingLines = (a: LineProps, b: LineProps): 0 | 1 | -1 => {
  // Selected lines should be drawn last (on top)
  if (a.isSelected && !b.isSelected) return 1;
  if (!a.isSelected && b.isSelected) return -1;
  return 0;
};

export const MappingLinksContainer: FunctionComponent = () => {
  const nodesConnectionPorts = useDocumentTreeStore((state) => state.nodesConnectionPorts);
  const nodesConnectionPortsArray = useDocumentTreeStore((state) => state.nodesConnectionPortsArray);
  const expansionState = useDocumentTreeStore((state) => state.expansionState);
  const expansionStateArray = useDocumentTreeStore((state) => state.expansionStateArray);

  const { getMappingLinks } = useMappingLinks();
  const svgRef = useReactRef<SVGSVGElement | null>(null);
  const mappingLinks = getMappingLinks();

  // Get SVG container offset to convert absolute coordinates to relative
  const svgRect = svgRef.current?.getBoundingClientRect();
  const svgOffsetLeft = svgRect?.left ?? 0;
  const svgOffsetTop = svgRect?.top ?? 0;

  const lineCoordList: LineProps[] = mappingLinks
    .map(({ sourceNodePath, targetNodePath, sourceDocumentId, targetDocumentId, isSelected, lineStyle }) => {
      const sourcePort = getNearestVisiblePort(sourceNodePath, {
        nodesConnectionPorts: nodesConnectionPorts[sourceDocumentId],
        nodesConnectionPortsArray: nodesConnectionPortsArray[sourceDocumentId],
        expansionState: expansionState[sourceDocumentId],
        expansionStateArray: expansionStateArray[sourceDocumentId],
      });
      const targetPort = getNearestVisiblePort(targetNodePath, {
        nodesConnectionPorts: nodesConnectionPorts[targetDocumentId],
        nodesConnectionPortsArray: nodesConnectionPortsArray[targetDocumentId],
        expansionState: expansionState[targetDocumentId],
        expansionStateArray: expansionStateArray[targetDocumentId],
      });
      const isSourceEdge = sourcePort.connectionTarget === 'edge';
      const isTargetEdge = targetPort.connectionTarget === 'edge';

      const isSourceParent = sourcePort.connectionTarget === 'parent';
      const isTargetParent = targetPort.connectionTarget === 'parent';

      let resolvedLineStyle = lineStyle;
      if (isSourceEdge || isTargetEdge) {
        resolvedLineStyle = MappingLineStyle.OUT_OF_VIEW;
      } else if (isSourceParent || isTargetParent) {
        resolvedLineStyle = MappingLineStyle.PARTIAL;
      } else if (
        sourcePort.connectionTarget === 'node' &&
        targetPort.connectionTarget === 'node' &&
        (lineStyle === MappingLineStyle.COMPLETE || lineStyle === MappingLineStyle.PARTIAL)
      ) {
        resolvedLineStyle = MappingLineStyle.REGULAR;
      }

      /* Convert absolute screen coordinates to SVG-relative coordinates */
      return {
        x1: sourcePort.position[0] - svgOffsetLeft,
        y1: sourcePort.position[1] - svgOffsetTop,
        x2: targetPort.position[0] - svgOffsetLeft,
        y2: targetPort.position[1] - svgOffsetTop,
        sourceNodePath,
        targetNodePath,
        isSelected,
        isSourceEdge,
        isTargetEdge,
        lineStyle: resolvedLineStyle,
      } as LineProps;
    })
    .filter(deduplicateByCoords())
    .sort(sortMappingLines);

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
            x1={lineProps.x1}
            y1={lineProps.y1}
            x2={lineProps.x2}
            y2={lineProps.y2}
            sourceNodePath={lineProps.sourceNodePath}
            targetNodePath={lineProps.targetNodePath}
            isSelected={lineProps.isSelected}
            isSourceEdge={lineProps.isSourceEdge}
            isTargetEdge={lineProps.isTargetEdge}
            lineStyle={lineProps.lineStyle}
          />
        ))}
      </g>
    </svg>
  );
};
