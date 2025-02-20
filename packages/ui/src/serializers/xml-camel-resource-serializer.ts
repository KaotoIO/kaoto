import { isXML, KaotoXmlParser } from './xml/kaoto-xml-parser';
import { CamelResource } from '../models/camel/camel-resource';
import { KaotoXmlSerializer } from './xml/serializers/kaoto-xml-serializer';
import { formatXml } from './xml/xml-utils';
import { CamelResourceSerializer, SerializerType } from './camel-resource-serializer';
import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';
import { EntityType } from '../models/camel/entities';
import { EntityDefinition } from './xml/serializers/entitiy-definition';

export class XmlCamelResourceSerializer implements CamelResourceSerializer {
  private comments: string[] = [];
  private static readonly COMMENT_REGEX = /<!--([\s\S]*?)-->/g;

  getType(): SerializerType {
    return SerializerType.XML;
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
    console.log(resource);
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
    this.comments = [];
    let match;

    while ((match = XmlCamelResourceSerializer.COMMENT_REGEX.exec(xml)) !== null) {
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
