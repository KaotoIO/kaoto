import {
  AngleDoubleDownIcon,
  AngleDoubleLeftIcon,
  AngleDoubleRightIcon,
  AngleDoubleUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from '@patternfly/react-icons';
import { ReactElement } from 'react';

import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CamelComponentSchemaService } from '../../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { LayoutType } from '../../Canvas/canvas.models';

export interface MoveIcons {
  prepend: ReactElement;
  append: ReactElement;
  moveBefore: ReactElement;
  moveNext: ReactElement;
}

/**
 * Determines the appropriate move icons based on graph layout and node type.
 *
 * Regular step nodes follow the graph layout:
 * - Vertical layout: up/down arrows
 * - Horizontal layout: left/right arrows
 *
 * Special child nodes (e.g., 'when' clauses in 'choice', 'doCatch' in 'doTry')
 * use inverted direction relative to the parent container's layout:
 * - In horizontal flow: vertical arrows (up/down)
 * - In vertical flow: horizontal arrows (left/right)
 *
 * @param layout - The graph layout (LayoutType.DagreVertical or LayoutType.DagreHorizontal)
 * @param vizNode - Optional visualization node to check if it's a special child
 * @returns Object containing appropriate icons for prepend, append, moveBefore, and moveNext actions
 */
export function getMoveIcons(layout: LayoutType | undefined, vizNode?: IVisualizationNode): MoveIcons {
  const isVerticalLayout = layout === LayoutType.DagreVertical;

  // Check if this node is a special child that uses inverted direction
  const isSpecialChild = isSpecialChildNode(vizNode);

  // Special children use inverted direction: horizontal icons in vertical layout, vertical icons in horizontal layout
  // Regular steps use icons based on the graph layout
  const useHorizontalIcons = isSpecialChild ? isVerticalLayout : !isVerticalLayout;

  return {
    prepend: useHorizontalIcons ? <ArrowLeftIcon /> : <ArrowUpIcon />,
    append: useHorizontalIcons ? <ArrowRightIcon /> : <ArrowDownIcon />,
    moveBefore: useHorizontalIcons ? <AngleDoubleLeftIcon /> : <AngleDoubleUpIcon />,
    moveNext: useHorizontalIcons ? <AngleDoubleRightIcon /> : <AngleDoubleDownIcon />,
  };
}

/**
 * Determines if a visualization node is a special child that uses inverted direction.
 *
 * Special children are nodes that belong to array-clause properties (e.g., 'when', 'doCatch')
 * and use inverted direction relative to the parent's layout (horizontal icons in vertical flow,
 * vertical icons in horizontal flow).
 *
 * @param vizNode - The visualization node to check
 * @returns true if the node is a special child, false otherwise
 */
function isSpecialChildNode(vizNode?: IVisualizationNode): boolean {
  if (!vizNode?.data) {
    return false;
  }

  const processorName = (vizNode.data as CamelRouteVisualEntityData).processorName;
  if (!processorName) {
    return false;
  }

  // Check if this processor is in the list of special child processors
  // These are processors that are part of array-clause properties and use inverted direction
  return CamelComponentSchemaService.SPECIAL_CHILD_PROCESSORS.includes(processorName);
}
