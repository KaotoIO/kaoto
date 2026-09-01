/*
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CamelYamlDsl, RouteDefinition } from '@kaoto/camel-catalog/types';
import xmlFormat from 'xml-formatter';

import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { KaotoXmlParser } from '../../serializers/xml/kaoto-xml-parser';
import { EntityDefinition } from '../../serializers/xml/serializers/entitiy-definition';
import { KaotoXmlSerializer } from '../../serializers/xml/serializers/kaoto-xml-serializer';
import { insertXmlComments, parseXmlComments } from '../../utils/xml-comments';
import { EntityType } from '../entities';
import { BaseEntityConstructor } from '../visualization/base-visual-entity';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { CamelRouteResource } from './camel-route-resource';
import { SourceSchemaType } from './source-schema-type';

type SupportedEntity = {
  type: EntityType;
  group: string;
  Entity: BaseEntityConstructor;
  isVisualEntity: boolean;
  isYamlOnly?: boolean;
};

const XML_DECLARATION_REGEX = /^(?:\s*)<\?xml(?:(?:\s+[^\s>]+))*\s*\?>/;

/**
 * Camel route resource backed by XML. Parsing Camel processors requires the catalog, which is
 * not loaded when the resource is constructed (see KaotoResource docs). The constructor parses
 * only the catalog-free metadata (declaration, comments, namespaces) and retains the raw XML;
 * the catalog-dependent entity parse is deferred to initialize(), run once the catalog is ready.
 */
export class CamelXMLRouteResource extends CamelRouteResource {
  /** XML supports the visual route entities only; the YAML-only entities are excluded. */
  static readonly SUPPORTED_ENTITIES: SupportedEntity[] = CamelRouteResource.SUPPORTED_ENTITIES.filter(
    ({ isYamlOnly }) => !isYamlOnly,
  );

  private readonly code: string;
  private readonly xmlDeclaration: string;
  private readonly rootElementDefinitions: { name: string; value: string }[];
  private readonly xmlSerializer = new XMLSerializer();
  private parsedRouteTemplate: RouteDefinition | undefined;

  constructor(source: string = '') {
    super();
    const parser = new KaotoXmlParser();
    this.xmlDeclaration = CamelXMLRouteResource.parseXmlDeclaration(source);
    this.code = source.replace(this.xmlDeclaration, '');
    this.comments = parseXmlComments(this.code);
    this.rootElementDefinitions = parser.parseRootElementDefinitions(this.code);
  }

  override get supportedEntities() {
    return CamelXMLRouteResource.SUPPORTED_ENTITIES;
  }

  override getType(): SourceSchemaType {
    return SourceSchemaType.RouteXml;
  }

  override async initialize(): Promise<void> {
    const parser = new KaotoXmlParser();
    const rawEntities = (await parser.parseXML(this.code)) as unknown as CamelYamlDsl;
    this.setRawEntities(rawEntities);
    const xmlTemplate = FlowTemplateService.getFlowSourceTemplate(this.getType());
    const parsedTemplate = (await parser.parseXML(xmlTemplate)) as Array<{ route: RouteDefinition }>;
    this.parsedRouteTemplate = parsedTemplate[0] as unknown as RouteDefinition;
    await super.initialize();
  }

  protected override getRouteTemplate(): RouteDefinition {
    const template = structuredClone((this.parsedRouteTemplate as unknown as { route: RouteDefinition }).route);
    template.id = getCamelRandomId('route');
    return { route: template } as unknown as RouteDefinition;
  }

  override async toSourceCode(): Promise<string> {
    const entities: EntityDefinition[] = this.getEntities().filter(
      (entity) => entity.type === EntityType.Beans,
    ) as EntityDefinition[];
    entities.push(...(this.getVisualEntities() as EntityDefinition[]));

    const xmlDocument = await KaotoXmlSerializer.serialize(entities, this.rootElementDefinitions);
    const xmlString = this.xmlSerializer.serializeToString(xmlDocument);
    const formatted = xmlFormat(xmlString);
    return this.getXmlDeclaration() + insertXmlComments(formatted, this.comments);
  }

  private getXmlDeclaration(): string {
    return this.xmlDeclaration ? this.xmlDeclaration + '\n' : '';
  }

  private static parseXmlDeclaration(xml: string): string {
    const match = XML_DECLARATION_REGEX.exec(xml);
    return match ? match[0] : '';
  }
}
