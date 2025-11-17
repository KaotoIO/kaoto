import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ArrowRightIcon, BoltIcon, DataSourceIcon, SyncAltIcon } from '@patternfly/react-icons';
import { ElementType } from 'react';

import { CamelCatalogService, CatalogKind } from '../models';

export const useProcessorIcon = (
  processorName: keyof ProcessorDefinition,
): { Icon: ElementType; description: string } | { Icon: null; description: undefined } => {
  let Icon: ElementType;
  let description: string;

  if (processorName === ('from' as keyof ProcessorDefinition)) {
    Icon = DataSourceIcon;
    const fromDescription = CamelCatalogService.getComponent(CatalogKind.Pattern, 'from')?.model.description;
    description = fromDescription ? `From: ${fromDescription}` : '';
  } else if (processorName === 'to') {
    Icon = ArrowRightIcon;
    const toDescription = CamelCatalogService.getComponent(CatalogKind.Pattern, 'to')?.model.description;
    description = toDescription ? `To: ${toDescription}` : '';
  } else if (processorName === 'toD') {
    Icon = BoltIcon;
    const toDDescription = CamelCatalogService.getComponent(CatalogKind.Pattern, 'toD')?.model.description;
    description = toDDescription ? `ToD: ${toDDescription}` : '';
  } else if (processorName === 'poll') {
    Icon = SyncAltIcon;
    const pollDescription = CamelCatalogService.getComponent(CatalogKind.Pattern, 'poll')?.model.description;
    description = pollDescription ? `Poll: ${pollDescription}` : '';
  } else {
    return { Icon: null, description: undefined };
  }

  return { Icon, description };
};
