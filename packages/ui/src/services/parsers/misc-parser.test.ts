import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { IKameletMetadata } from '../../models/camel/kamelets-catalog';
import { MetadataEntity } from '../../models/visualization/metadata';
import { pipeYaml } from '../../stubs';
import { MiscParser } from './misc-parser';

describe('MiscParser', () => {
  describe('parseMetadataEntity()', () => {
    it('should parse Metadata', () => {
      const metadataEntity = CamelResourceFactory.createCamelResource(pipeYaml)
        .getEntities()
        .find((entity) => entity instanceof MetadataEntity) as MetadataEntity;
      const parsedTables = MiscParser.parseMetadataEntity(metadataEntity, 'Metadata');

      expect(parsedTables).toHaveLength(2);

      expect(parsedTables[0].title).toBe('Metadata');
      expect(parsedTables[0].description).toBe('');
      expect(parsedTables[0].headingLevel).toBe('h1');
      expect(parsedTables[0].headers).toHaveLength(2);
      expect(parsedTables[0].headers[0]).toBe('Property Name');
      expect(parsedTables[0].headers[1]).toBe('Value');
      expect(parsedTables[0].data).toHaveLength(1);
      expect(parsedTables[0].data[0][0]).toBe('name');
      expect(parsedTables[0].data[0][1]).toBe('webhook-binding');

      expect(parsedTables[1].title).toBe('Metadata : Annotations');
      expect(parsedTables[1].description).toBe('');
      expect(parsedTables[1].headingLevel).toBe('h2');
      expect(parsedTables[1].headers).toHaveLength(2);
      expect(parsedTables[1].headers[0]).toBe('Name');
      expect(parsedTables[1].headers[1]).toBe('Value');
      expect(parsedTables[1].data).toHaveLength(11);
      expect(parsedTables[1].data[0][0]).toBe('sco1237896.github.com/catalog.group');
      expect(parsedTables[1].data[0][1]).toBe('messaging');
    });

    describe('Kamelet icon', () => {
      const ICON_ANNOTATION = 'camel.apache.org/kamelet.icon';
      const dataUri = 'data:image/svg+xml;base64,PHN2Zy8+';

      const createMetadataEntity = (icon: string) =>
        new MetadataEntity({
          metadata: {
            name: 'my-kamelet',
            annotations: { [ICON_ANNOTATION]: icon, 'camel.apache.org/provider': 'Apache' },
          } as unknown as Partial<IKameletMetadata>,
        });

      const getIconCell = (icon: string, iconFileName?: string) => {
        const parsedTables = MiscParser.parseMetadataEntity(createMetadataEntity(icon), 'Metadata', iconFileName);
        const iconTable = parsedTables.find((table) => table.headers[0] === 'Metadata : Annotations : Icon');
        return { parsedTables, iconCell: iconTable?.data[0][0] };
      };

      it('should keep the icon inline when no icon file name is provided', () => {
        const { iconCell } = getIconCell(dataUri);

        expect(iconCell).toBe(`![icon](${dataUri})`);
      });

      it('should reference the icon file when a data URI icon and an icon file name are provided', () => {
        const { iconCell } = getIconCell(dataUri, 'route-export-icon.svg');

        expect(iconCell).toBe('![icon](route-export-icon.svg)');
      });

      it.each([['https://example.com/icon.svg'], ['./icon.svg'], ['data:image/bmp;base64,AAAA']])(
        'should keep a non-extractable icon (%s) unchanged even if an icon file name is provided',
        (icon) => {
          const { iconCell } = getIconCell(icon, 'route-export-icon.svg');

          expect(iconCell).toBe(`![icon](${icon})`);
        },
      );

      it('should not list the icon in the annotations table', () => {
        const { parsedTables } = getIconCell(dataUri, 'route-export-icon.svg');
        const annotationsTable = parsedTables.find((table) => table.title === 'Metadata : Annotations');

        expect(annotationsTable?.data).toEqual([['camel.apache.org/provider', 'Apache']]);
      });
    });
  });
});
