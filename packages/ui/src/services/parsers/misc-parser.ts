import { KameletKnownAnnotations } from '../../models/camel/kamelets-catalog';
import { ParsedTable } from '../../models/documentation';
import { MetadataEntity } from '../../models/visualization/metadata';
import { parseImageDataUri } from '../../utils/data-uri';
import { CommonParser } from './common-parser';

export class MiscParser {
  /**
   * @param iconFileName When provided and the Kamelet icon is an image data URI, the icon is referenced
   * by this file name instead of being inlined, since inline base64 images are not supported by all markdown renderers.
   */
  static parseMetadataEntity(entity: MetadataEntity, label: string, iconFileName?: string): ParsedTable[] {
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
        if (annoKey === KameletKnownAnnotations.Icon) {
          const iconSource = iconFileName && parseImageDataUri(annoValue) ? iconFileName : annoValue;
          const iconTable = new ParsedTable({
            title: '',
            headers: ['Metadata : Annotations : Icon'],
            headingLevel: 'h5',
            data: [[`![icon](${iconSource})`]],
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
