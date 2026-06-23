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

import { CamelYamlDsl } from '@kaoto/camel-catalog/types';
import xmlFormat from 'xml-formatter';

import { KaotoXmlParser } from '../../serializers/xml/kaoto-xml-parser';
import { EntityDefinition } from '../../serializers/xml/serializers/entitiy-definition';
import { KaotoXmlSerializer } from '../../serializers/xml/serializers/kaoto-xml-serializer';
import { insertXmlComments, parseXmlComments } from '../../utils/xml-comments';
import { EntityType } from '../entities';
import { BaseVisualCamelEntityConstructor } from '../visualization/base-visual-entity';
import { CamelRouteResource } from './camel-route-resource';

type SupportedEntity = {
  type: EntityType;
  group: string;
  Entity: BaseVisualCamelEntityConstructor;
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

  override async initialize(): Promise<void> {
    const parser = new KaotoXmlParser();
    this.setRawEntities(parser.parseXML(this.code) as CamelYamlDsl);
    super.initialize();
  }

  override toString(): string {
    const entities: EntityDefinition[] = this.getEntities().filter(
      (entity) => entity.type === EntityType.Beans,
    ) as EntityDefinition[];
    entities.push(...(this.getVisualEntities() as EntityDefinition[]));

    const xmlDocument = KaotoXmlSerializer.serialize(entities, this.rootElementDefinitions);
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
