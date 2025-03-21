import { isXML, KaotoXmlParser } from './xml/kaoto-xml-parser';
import { CamelResource } from '../models/camel/camel-resource';
import { KaotoXmlSerializer } from './xml/serializers/kaoto-xml-serializer';
import { CamelResourceSerializer, Metadata, SerializerType } from './camel-resource-serializer';
import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';
import { EntityType } from '../models/camel/entities';
import { EntityDefinition } from './xml/serializers/entitiy-definition';
import { XmlFormatter } from './xml/utils/xml-formatter';

export type XMLMetadata = {
  xmlDeclaration: string;
  rootElementDefinitions: { name: string; value: string }[];
};

export class XmlCamelResourceSerializer implements CamelResourceSerializer {
  private comments: string[] = [];
  private metadata: XMLMetadata = { xmlDeclaration: '', rootElementDefinitions: [] };
  xmlSerializer: XMLSerializer = new XMLSerializer();

  private static readonly COMMENT_REGEX = /<!--([\s\S]*?)-->/g;
  private static readonly XML_DECLARATION_REGEX = /^(?:\s*)<\?xml(?:(?:\s+[^\s>]+))*\s*\?>/;

  getType(): SerializerType {
    return SerializerType.XML;
  }

  static isApplicable(code: unknown): boolean {
    return isXML(code as string);
  }

  parse(code: unknown): CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe {
    const xmlParser = new KaotoXmlParser();

    this.metadata.xmlDeclaration = this.parseXmlDeclaration(code as string);

    const codeWithoutDeclaration = (code as string).replace(this.metadata.xmlDeclaration, '');
    this.extractComments(codeWithoutDeclaration);
    this.metadata.rootElementDefinitions = xmlParser.parseRootElementDefinitions(codeWithoutDeclaration);
    const entities = xmlParser.parseXML(codeWithoutDeclaration as string);

    return entities as CamelYamlDsl;
  }

  serialize(resource: CamelResource): string {
    const entities: EntityDefinition[] = resource
      .getEntities()
      .filter((entity) => entity.type === EntityType.Beans) as EntityDefinition[];
    entities.push(...(resource.getVisualEntities() as EntityDefinition[]));

    const xmlDocument = KaotoXmlSerializer.serialize(entities, this.metadata.rootElementDefinitions);
    const xmlString = this.xmlSerializer.serializeToString(xmlDocument);
    const formattedString = XmlFormatter.formatXml(xmlString);
    return this.getXmlDeclaration() + this.insertComments(formattedString);
  }

  getComments(): string[] {
    return this.comments;
  }

  setComments(comments: string[]): void {
    this.comments = comments;
  }

  getMetadata(): Metadata {
    return this.metadata;
  }

  setMetadata(metadata: Metadata): void {
    this.metadata = metadata as XMLMetadata;
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
    return match ? match[0] : '';
  }

  private insertComments(xml: string): string {
    const commentsString = this.comments.map((comment) => `<!-- ${comment} -->`).join('\n');
    return commentsString ? commentsString + '\n' + xml : xml;
  }

  private getXmlDeclaration(): string {
    if (!this.metadata.xmlDeclaration || this.metadata.xmlDeclaration === '') return '';
    return this.metadata.xmlDeclaration + '\n';
  }
}
