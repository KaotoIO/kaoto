import './FieldNodePopover.scss';

import { Information } from '@carbon/icons-react';
import { Button, Popover } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent } from 'react';

import { NodeData } from '../../../models/datamapper/visualization';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { isFieldNode, prepareFieldDetails } from './field-details-utils';
import { FieldDetailsContent } from './FieldDetailsContent';

interface FieldNodePopoverProps {
  nodeData: NodeData;
  namespaceMap?: Record<string, string>;
  enabled?: boolean;
}

/**
 * Component that displays an (i) icon which shows field details in a Popover
 * when clicked. The popover displays field details like minOccurs, maxOccurs,
 * and override information.
 *
 * For non-field nodes (documents, variables, mappings), nothing is rendered.
 */
export const FieldNodePopover: FunctionComponent<FieldNodePopoverProps> = ({
  nodeData,
  namespaceMap = {},
  enabled = true,
}) => {
  if (!enabled || !isFieldNode(nodeData)) {
    return null;
  }

  const field = VisualizationUtilService.getField(nodeData);

  if (!field) {
    return null;
  }

  const detailItems = prepareFieldDetails(field, namespaceMap);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <Popover
      aria-label={`Field details for ${field.name}`}
      bodyContent={<FieldDetailsContent items={detailItems} />}
      position="right"
      distance={10}
    >
      <Button onClick={handleClick} variant="plain" aria-label="More info" icon={<Information />} />
    </Popover>
  );
};
