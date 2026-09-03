import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';

export class CamelComponentSchemaService {
  static readonly DISABLED_REMOVE_STEPS = ['from', 'route'] as unknown as (keyof ProcessorDefinition)[];
  static readonly PROCESSOR_STRING_DEFINITIONS: Record<string, string> = {
    to: 'uri',
    toD: 'uri',
    log: 'message',
    convertBodyTo: 'type',
    setExchangePattern: 'pattern',
    bean: 'ref',
    customLoadlBadalancer: ' ref',
    routingSlip: 'expression',
    routeBuilder: 'ref',
    removeVariable: 'name',
    removeProperty: 'name',
    removeProperties: 'pattern',
    removeHeader: 'name',
    removeHeaders: 'pattern',
    kamelet: 'name',
  };

  static canBeDisabled(processorName: keyof ProcessorDefinition): boolean {
    if (processorName == DATAMAPPER_ID_PREFIX) {
      return true;
    }

    const processorDefinition = CamelCatalogService.getComponent(CatalogKind.Processor, processorName);

    return Object.keys(processorDefinition?.properties ?? {}).includes('disabled');
  }
}
