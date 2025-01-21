import { IKameletDataShape, IKameletSpecDefinition, KameletVisualEntity } from '../../models';
import { HeadingLevel, ParsedTable } from '../../models/documentation';
import { CommonParser } from './common-parser';
import { RouteParser } from './route-parser';
import { FromDefinition } from '@kaoto/camel-catalog/types';

export class KameletParser {
  static parseKameletEntity(entity: KameletVisualEntity): ParsedTable[] {
    const answer: ParsedTable[] = [];

    const routeTable = KameletParser.parseRoute(entity.kamelet.spec.template.from);
    answer.push(routeTable);

    const definitionTable = KameletParser.parseDefinition(entity.kamelet.spec.definition);
    answer.push(definitionTable);

    if (entity.kamelet.spec.types) {
      const typesTable = KameletParser.parseTypes(entity.kamelet.spec.types);
      answer.push(typesTable);
    }
    if (entity.kamelet.spec.dataTypes) {
      const dataTypesTables = KameletParser.parseDataTypes(entity.kamelet.spec.dataTypes);
      answer.push(...dataTypesTables);
    }

    const dependenciesTable = KameletParser.parseDependencies(entity.kamelet.spec.dependencies);
    answer.push(dependenciesTable);

    return answer;
  }

  private static parseRoute(fromModel: FromDefinition): ParsedTable {
    const parsedSteps = CommonParser.parseFrom(fromModel);
    const routeTable: ParsedTable = new ParsedTable({
      title: 'Steps',
      headers: RouteParser.HEADERS_STEP_PARAMETER,
    });

    parsedSteps.forEach((step) => {
      const paramWithDesc = step.description ? { description: step.description } : {};
      step.parameters && Object.assign(paramWithDesc, step.parameters);
      if (Object.keys(paramWithDesc).length === 0) {
        routeTable.data.push([step.id, step.name, step.uri, '', '']);
        return;
      }
      Object.entries(paramWithDesc).forEach(([paramKey, paramValue], index) => {
        routeTable.data.push([
          index === 0 ? step.id : '',
          index === 0 ? step.name : '',
          index === 0 ? step.uri : '',
          paramKey,
          paramValue,
        ]);
      });
    });
    return routeTable;
  }

  private static parseDefinition(definition: IKameletSpecDefinition): ParsedTable {
    const parsedTable = new ParsedTable({
      title: 'Definition',
      headers: ['Property Name', 'Meta Property Name', 'Value'],
      description: definition.description,
    });
    const rootParams = CommonParser.parseParameters(definition, ['properties']);
    Object.entries(rootParams).forEach(([paramKey, paramValue], index) => {
      parsedTable.data.push([index === 0 ? '(root)' : '', paramKey, paramValue]);
    });
    definition.properties &&
      Object.entries(definition.properties).forEach(([propKey, propValue]) => {
        const flattened = CommonParser.parseParameters(propValue);
        Object.entries(flattened).forEach(([metaKey, metaValue], index) => {
          parsedTable.data.push([index === 0 ? propKey : '', metaKey, metaValue]);
        });
      });
    return parsedTable;
  }

  private static parseTypes(types: { in?: { mediaType: string }; out?: { mediaType: string } }): ParsedTable {
    const parsedTable = new ParsedTable({
      title: 'Types',
      headers: ['IN/OUT', 'Media Type'],
    });
    if (types.in) {
      parsedTable.data.push(['in', types.in.mediaType]);
    }
    if (types.out) {
      parsedTable.data.push(['out', types.out.mediaType]);
    }
    return parsedTable;
  }

  private static parseDependencies(dependencies: string[]): ParsedTable {
    return new ParsedTable({
      title: 'Dependencies',
      headers: ['Dependency'],
      data: [...dependencies.map((dep) => [dep])],
    });
  }

  private static parseDataTypes(dataTypes: {
    in?: { default?: string; types?: Record<string, IKameletDataShape> };
    out?: { default?: string; types?: Record<string, IKameletDataShape> };
    error?: { default?: string; types?: Record<string, IKameletDataShape> };
  }): ParsedTable[] {
    const parsedTables: ParsedTable[] = [new ParsedTable({ title: 'Data Types' })];

    if (dataTypes.in) {
      parsedTables.push(...KameletParser.parseDataTypeChannel(dataTypes.in, 'IN'));
    }

    if (dataTypes.out) {
      parsedTables.push(...KameletParser.parseDataTypeChannel(dataTypes.out, 'OUT'));
    }

    if (dataTypes.error) {
      parsedTables.push(...KameletParser.parseDataTypeChannel(dataTypes.error, 'ERROR'));
    }

    return parsedTables;
  }

  private static parseDataTypeChannel(
    channel: { default?: string; headers?: Record<string, unknown>; types?: Record<string, IKameletDataShape> },
    title: string,
  ): ParsedTable[] {
    const channelTables: ParsedTable[] = [
      new ParsedTable({
        title: title,
        headers: ['Property Name', 'Value'],
        headingLevel: 'h2',
        data: channel.default ? [['Default Data Type', channel.default]] : [],
      }),
    ];

    if (channel.headers) {
      channelTables.push(KameletParser.parseHeaders(channel.headers, title, 'h2'));
    }

    channel.types &&
      Object.entries(channel.types).forEach(([typeName, typeModel]) => {
        const typeTitle = `${title} : ${typeName}`;
        const typeTable = new ParsedTable({
          title: typeTitle,
          headers: ['Property Name', 'Value'],
          headingLevel: 'h3',
        });
        const parsedParams = CommonParser.parseParameters(typeModel, ['headers', 'schema']);
        Object.entries(parsedParams).forEach(([paramKey, paramValue]) => {
          typeTable.data.push([paramKey, '', paramValue]);
        });
        channelTables.push(typeTable);

        if (typeModel.headers) {
          channelTables.push(KameletParser.parseHeaders(typeModel.headers, typeTitle, 'h3'));
        }

        if (typeModel.schema && (typeModel.schema as Record<string, unknown>).properties) {
          const schemaProperties = (typeModel.schema as Record<string, unknown>).properties as Record<string, unknown>;
          const schemaTable = new ParsedTable({
            title: `${typeTitle} : Schema`,
            headers: ['Property Name', 'Meta Property Name', 'Value'],
            headingLevel: 'h3',
          });
          Object.entries(schemaProperties).forEach(([propKey, propValue]) => {
            const parsedMetaParams = CommonParser.parseParameters(propValue as Record<string, unknown>);
            Object.entries(parsedMetaParams).forEach(([metaParamKey, metaParamValue], index) => {
              schemaTable.data.push([index === 0 ? propKey : '', metaParamKey, metaParamValue]);
            });
          });
          channelTables.push(schemaTable);
        }
      });
    return channelTables;
  }

  private static parseHeaders(headersModel: Record<string, unknown>, title: string, headingLevel: HeadingLevel) {
    const headerTable = new ParsedTable({
      title: `${title} : Headers`,
      headers: ['Header Name', 'Property Name', 'Value'],
      headingLevel: headingLevel,
    });

    Object.entries(headersModel).forEach(([headerName, headerModel]) => {
      const parsedHeaderProps = CommonParser.parseParameters(headerModel as Record<string, unknown>);
      Object.entries(parsedHeaderProps).forEach(([propKey, propValue], index) => {
        headerTable.data.push([index === 0 ? headerName : '', propKey, propValue]);
      });
    });
    return headerTable;
  }
}
