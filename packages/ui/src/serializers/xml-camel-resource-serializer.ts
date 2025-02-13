import { isXML, KaotoXmlParser } from './xml/kaoto-xml-parser';
import { CamelResource } from '../models/camel/camel-resource';
import { EntityDefinition, KaotoXmlSerializer } from './xml/serializers/kaoto-xml-serializer';
import { formatXml } from './xml/xml-utils';
import { CamelResourceSerializer } from './camel-resource-serializer';
import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';
import { EntityType } from '../models/camel/entities';

export class XmlCamelResourceSerializer implements CamelResourceSerializer {
  private comments: string[] = [];

  getLabel(): string {
    return 'XML';
  }

  static isApplicable(code: unknown): boolean {
    return isXML(code as string);
  }

  xmlSerializer: XMLSerializer = new XMLSerializer();

  parse(code: unknown): CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe {
    const xmlParser = new KaotoXmlParser();
    const entities = xmlParser.parseXML(code as string);
    this.extractComments(code as string);
    return entities as CamelYamlDsl;
  }

  serialize(resource: CamelResource): string {
    const entities: EntityDefinition[] = resource
      .getEntities()
      .filter((entity) => entity.type === EntityType.Beans) as EntityDefinition[];
    entities.push(...(resource.getVisualEntities() as EntityDefinition[]));

    const xmlDocument = KaotoXmlSerializer.serialize(entities);
    let xmlString = this.xmlSerializer.serializeToString(xmlDocument);

    xmlString = this.insertComments(xmlString);

    return formatXml(xmlString);
  }

  getComments(): string[] {
    return this.comments;
  }

  setComments(comments: string[]): void {
    this.comments = comments;
  }

  private extractComments(xml: string): void {
    const commentRegex = /<!--([\s\S]*?)-->/g;
    this.comments = [];
    let match;

    while ((match = commentRegex.exec(xml)) !== null) {
      if (xml.slice(0, match.index).trim() === '') {
        this.comments.push(match[1].trim());
      } else {
        break;
      }
    }
  }

  private insertComments(xml: string): string {
    const commentsString = this.comments.map((comment) => `<!-- ${comment} -->`).join('\n');
    return commentsString ? commentsString + '\n' + xml : xml;
  }
}
