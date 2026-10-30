import {
  parseCitrusXml,
  parseRootAttributes,
  parseXmlDeclaration,
  serializeCitrusXml,
} from '../../serializers/xml/citrus-xml-parser';
import { SourceSchemaType } from '../camel/source-schema-type';
import { EntityType } from '../entities';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { CitrusTestResource } from './citrus-test-resource';
import { Test } from './entities/Test';

export class CitrusXMLTestResource extends CitrusTestResource {
  private readonly code: string;
  private readonly xmlDeclaration: string;
  private readonly rootAttributes: string[];

  constructor(source: string = '') {
    super();
    this.xmlDeclaration = parseXmlDeclaration(source);
    this.rootAttributes = parseRootAttributes(source);
    this.code = source;
  }

  override getType(): SourceSchemaType {
    return SourceSchemaType.TestXml;
  }

  override addNewEntity(entityType?: EntityType, entityTemplate?: unknown): string {
    if (!entityTemplate && (!entityType || entityType === EntityType.Test)) {
      const template = parseCitrusXml(FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.TestXml));
      return super.addNewEntity(entityType, template);
    }
    return super.addNewEntity(entityType, entityTemplate);
  }

  override async initialize(): Promise<void> {
    if (this.code.trim()) {
      const test = parseCitrusXml(this.code);
      this.setRawEntities(test);
    }
    await super.initialize();
  }

  override async toSourceCode(): Promise<string> {
    const entity = this.getVisualEntities()[0];
    if (entity) {
      const snapshot = (await entity.normaliseForSerialisation()) as Test;
      return serializeCitrusXml(snapshot, this.xmlDeclaration || undefined, this.rootAttributes);
    }
    const json = this.toJSON() as Test;
    if (json?.name !== undefined) {
      return serializeCitrusXml(json, this.xmlDeclaration || undefined);
    }
    return FlowTemplateService.getFlowSourceTemplate(SourceSchemaType.TestXml);
  }
}
