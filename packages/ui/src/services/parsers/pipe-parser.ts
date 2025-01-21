import { KameletBindingVisualEntity, PipeVisualEntity } from '../../models';
import { ParsedTable } from '../../models/documentation';
import { CommonParser } from './common-parser';
import { PipeErrorHandlerEntity } from '../../models/visualization/metadata/pipeErrorHandlerEntity';

export class PipeParser {
  static parsePipeEntity(entity: PipeVisualEntity) {
    const parsedTable = new ParsedTable({
      title: 'Steps',
      headers: ['Step Type', 'Endpoint', 'Property Name', 'Value'],
    });

    entity.pipe.spec?.source && PipeParser.populateStep(parsedTable, 'source', entity.pipe.spec.source);
    entity.pipe.spec?.steps?.forEach((step) => {
      return PipeParser.populateStep(parsedTable, 'step', step);
    });
    entity.pipe.spec?.sink && PipeParser.populateStep(parsedTable, 'sink', entity.pipe.spec.sink);

    return parsedTable;
  }

  static parseKameletBindingEntity(entity: KameletBindingVisualEntity) {
    return PipeParser.parsePipeEntity(entity);
  }

  static populateStep(parsedTable: ParsedTable, stepType: string, model: Record<string, unknown>) {
    const records: string[][] = [];
    if (model.uri) {
      records.push([stepType, 'URI', '', model.uri as string]);
    } else if (model.ref) {
      const ref = model.ref as Record<string, unknown>;
      records.push([stepType, 'REF Kind', '', ref.kind as string]);
      records.push(['', 'REF API Version', '', ref.apiVersion as string]);
      records.push(['', 'REF Name', '', ref.name as string]);
    }
    if (model.properties) {
      const parsedProperties = CommonParser.parseParameters(model.properties as Record<string, unknown>);
      Object.entries(parsedProperties).forEach(([propKey, propValue], index) => {
        records.push([records.length === 0 && index === 0 ? stepType : '', '', propKey, propValue]);
      });
    }
    parsedTable.data.push(...records);
  }

  static parsePipeErrorHandlerEntity(entity: PipeErrorHandlerEntity, label: string): ParsedTable | undefined {
    if (!entity.parent.errorHandler) return;

    const keys = Object.keys(entity.parent.errorHandler);
    if (keys.length === 0) return;

    if (keys[0] === 'none') {
      return new ParsedTable({
        title: label,
        headers: ['Type'],
        data: [['none']],
      });
    }

    const errorHandlerModel = entity.parent.errorHandler[keys[0]] as Record<string, unknown>;
    const parsedParams = errorHandlerModel.parameters ? CommonParser.parseParameters(errorHandlerModel.parameters) : {};

    if (keys[0] === 'log') {
      return new ParsedTable({
        title: label,
        headers: ['Type', 'Parameter Name', 'Value'],
        data: Object.entries(parsedParams).map(([propKey, propValue], index) => [
          index === 0 ? keys[0] : '',
          propKey,
          propValue,
        ]),
      });
    }

    if (keys[0] === 'sink') {
      const parsedTable = new ParsedTable({
        title: label,
        headers: ['Type', 'Endpoint', 'Parameter Name', 'Value'],
      });
      if (errorHandlerModel.endpoint) {
        const model = errorHandlerModel.endpoint as Record<string, unknown>;
        if (model.uri) {
          parsedTable.data.push([keys[0], 'URI', '', model.uri as string]);
        } else if (model.ref) {
          const ref = model.ref as Record<string, unknown>;
          parsedTable.data.push([keys[0], 'REF Kind', '', ref.kind as string]);
          parsedTable.data.push(['', 'REF API Version', '', ref.apiVersion as string]);
          parsedTable.data.push(['', 'REF Name', '', ref.name as string]);
        }
        if (model.properties) {
          const parsedProperties = CommonParser.parseParameters(model.properties as Record<string, unknown>);
          Object.entries(parsedProperties).forEach(([propKey, propValue], index) => {
            parsedTable.data.push([
              parsedTable.data.length === 0 && index === 0 ? keys[0] : '',
              propKey,
              '',
              propValue,
            ]);
          });
        }
      }

      const paramRecords = Object.entries(parsedParams).map(([propKey, propValue], index) => [
        parsedTable.data.length === 0 && index === 0 ? keys[0] : '',
        '',
        propKey,
        propValue,
      ]);
      parsedTable.data.push(...paramRecords);

      return parsedTable;
    }

    return ParsedTable.unsupported(entity);
  }
}
