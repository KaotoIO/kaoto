import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { ParsedTable } from '../../models/documentation';
import { Delete, Get, Head, Patch, Post, Put } from '@kaoto/camel-catalog/types';
import { CommonParser } from './common-parser';

export class RestParser {
  static readonly HEADERS_REST: ReadonlyArray<string> = ['Method', 'ID', 'Path', 'Route'];
  static readonly HEADERS_REST_CONFIGURATION: ReadonlyArray<string> = ['Parameter Name', 'Parameter Value'];

  static parseRestEntity(entity: CamelRestVisualEntity): ParsedTable {
    const restDefinition = entity.restDef.rest;

    const openApiSpec = restDefinition.openApi?.specification;
    if (openApiSpec) {
      return new ParsedTable({
        title: restDefinition.id,
        description: restDefinition.description,
        headers: ['Open API Specification'],
        data: [[openApiSpec]],
      });
    }
    const answer = new ParsedTable({
      title: `${restDefinition.id} [Path : ${restDefinition.path}]`,
      description: restDefinition.description,
      headers: RestParser.HEADERS_REST,
    });

    RestParser.populateMethod(answer, 'GET', restDefinition.get);
    RestParser.populateMethod(answer, 'POST', restDefinition.post);
    RestParser.populateMethod(answer, 'PUT', restDefinition.put);
    RestParser.populateMethod(answer, 'DELETE', restDefinition.delete);
    RestParser.populateMethod(answer, 'HEAD', restDefinition.head);
    RestParser.populateMethod(answer, 'PATCH', restDefinition.patch);

    return answer;
  }

  private static populateMethod(
    parsedTable: ParsedTable,
    method: string,
    methodModel: Get[] | Post[] | Put[] | Delete[] | Head[] | Patch[] | undefined,
  ) {
    if (!methodModel || methodModel.length === 0) return;

    methodModel.forEach((model, index) => {
      const toUri = typeof model.to === 'string' ? model.to : model.to?.uri || '';
      parsedTable.data.push([index === 0 ? method : '', model.id || '', model.path || '', toUri]);
    });
  }

  static parseRestConfigurationEntity(entity: CamelRestConfigurationVisualEntity): ParsedTable {
    const restConfiguration = entity.restConfigurationDef.restConfiguration;
    const parsedTable = new ParsedTable({
      title: entity.id ? entity.id : 'Rest Configuration',
      headers: RestParser.HEADERS_REST_CONFIGURATION,
    });

    const parsedParameters = CommonParser.parseParameters(restConfiguration);
    Object.entries(parsedParameters).forEach(([propKey, propValue]) => parsedTable.data.push([propKey, propValue]));

    return parsedTable;
  }
}
