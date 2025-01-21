import { MetadataEntity } from '../../models/visualization/metadata';
import { ParsedTable } from '../../models/documentation';
import { CommonParser } from './common-parser';

export class MiscParser {
  private static readonly KAMELET_ICON_ANNOTATION = 'camel.apache.org/kamelet.icon';

  static parseMetadataEntity(entity: MetadataEntity, label: string): ParsedTable[] {
    if (!entity.parent.metadata) return [];

    const parsedTables: ParsedTable[] = [
      new ParsedTable({
        title: label,
        headers: ['Property Name', 'Value'],
      }),
    ];

    const parsedParams = CommonParser.parseParameters(entity.parent.metadata, ['annotations', 'labels']);
    Object.entries(parsedParams).forEach(([propKey, propValue]) => {
      parsedTables[0].data.push([propKey, propValue]);
    });

    if (entity.parent.metadata.labels) {
      const annotationsTable = new ParsedTable({
        title: `${label} : Labels`,
        headers: ['Name', 'Value'],
        headingLevel: 'h2',
      });
      Object.entries(entity.parent.metadata.labels).forEach(([labelKey, labelValue]) => {
        annotationsTable.data.push([labelKey, labelValue]);
      });
      parsedTables.push(annotationsTable);
    }

    if (entity.parent.metadata.annotations) {
      const annotationsTable = new ParsedTable({
        title: `${label} : Annotations`,
        headers: ['Name', 'Value'],
        headingLevel: 'h2',
      });
      parsedTables.push(annotationsTable);
      Object.entries(entity.parent.metadata.annotations).forEach(([annoKey, annoValue]) => {
        if (annoKey === MiscParser.KAMELET_ICON_ANNOTATION) {
          const iconTable = new ParsedTable({
            title: '',
            headers: ['Metadata : Annotations : Icon'],
            headingLevel: 'h5',
            data: [[`![icon](${annoValue})`]],
          });
          parsedTables.push(iconTable);
        } else {
          annotationsTable.data.push([annoKey, annoValue]);
        }
      });
    }

    return parsedTables;
  }
}
