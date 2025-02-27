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
  private xmlDeclaration: string = '';
  xmlSerializer: XMLSerializer = new XMLSerializer();

  private static readonly COMMENT_REGEX = /<!--([\s\S]*?)-->/g;
  private static readonly XML_DECLARATION_REGEX = /^\s*<\?xml(?:\s+[^>]*?)?\s*\??>/;

  getType(): SerializerType {
    return SerializerType.XML;
  }

  static isApplicable(code: unknown): boolean {
    return isXML(code as string);
  }

  parse(code: unknown): CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe {
    const xmlParser = new KaotoXmlParser();

    this.xmlDeclaration = this.parseXmlDeclaration(code as string);
    const codeWithoutDeclaration = (code as string).replace(this.xmlDeclaration, '');
    this.extractComments(codeWithoutDeclaration);
    const entities = xmlParser.parseXML(codeWithoutDeclaration as string);
    console.log('code without declaration', codeWithoutDeclaration, this.xmlDeclaration);
    return entities as CamelYamlDsl;
  }

  serialize(resource: CamelResource): string {
    const entities: EntityDefinition[] = resource
      .getEntities()
      .filter((entity) => entity.type === EntityType.Beans) as EntityDefinition[];
    entities.push(...(resource.getVisualEntities() as EntityDefinition[]));

    const xmlDocument = KaotoXmlSerializer.serialize(entities);
    let xmlString = this.xmlSerializer.serializeToString(xmlDocument);
    xmlString = (this.xmlDeclaration !== '' ? this.xmlDeclaration + '\n' : '') + this.insertComments(xmlString);

    return formatXml(xmlString);
  }

  getComments(): string[] {
    return this.comments;
  }

  setComments(comments: string[]): void {
    this.comments = comments;
  }

  getMetadata(): string {
    return this.xmlDeclaration;
  }

  setMetadata(metadata: string): void {
    this.xmlDeclaration = metadata;
  }

  private extractComments(xml: string): void {
    this.comments = [];
    let match;
    let index = 0;

    while ((match = XmlCamelResourceSerializer.COMMENT_REGEX.exec(xml)) !== null) {
      if (xml.slice(index, match.index).trim() === '') {
        this.comments.push(match[1].trim());
        index = match.index + match[0].length;
      } else {
        break;
      }
    }
  }

  private parseXmlDeclaration(xml: string): string {
    const match = XmlCamelResourceSerializer.XML_DECLARATION_REGEX.exec(xml);
    console.log('match', match);
    return match ? match[0] : '';
  }

  private insertComments(xml: string): string {
    const commentsString = this.comments.map((comment) => `<!-- ${comment} -->`).join('\n');
    return commentsString ? commentsString + '\n' + xml : xml;
  }
}
