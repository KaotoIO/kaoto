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

import { Param, ResponseMessage, Rest, RestSecurity, SecurityDefinitions } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../models';
import { REST_DSL_VERBS } from '../../../models/special-processors.constants';
import { extractAttributesFromXmlElement } from '../utils/xml-utils';
import { RouteXmlParser } from './route-xml-parser';
import { StepParser } from './step-parser';

export class RestXmlParser {
  routeXmlParser = new RouteXmlParser();

  // Main transformation for <rest> elements
  static async parse(restElement: Element): Promise<Rest> {
    const properties = (await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, 'rest'))?.properties;

    const rest = await this.parseRestVerbs(restElement);
    return {
      ...extractAttributesFromXmlElement(restElement, properties),
      ...rest,
      securityDefinitions: (await this.parseSecurityDefinitions(restElement)) as unknown as SecurityDefinitions,
      securityRequirements: await this.parseSecurityRequirements(restElement),
    };
  }

  // Transform verbs like <get>, <post>, etc.
  private static async parseRestVerbs(restElement: Element): Promise<Rest> {
    const verbs: { [key: string]: unknown } = {};

    // For each verb, look for its elements and transform them
    for (const verb of REST_DSL_VERBS) {
      const verbInstances = Array.from(restElement.getElementsByTagName(verb));
      if (verbInstances.length > 0) {
        verbs[verb] = await Promise.all(verbInstances.map((verbElement: Element) => this.parseRestVerb(verbElement)));
      }
    }

    return verbs as unknown as Rest;
  }

  static async parseRestVerb(verbElement: Element) {
    const verb = (await StepParser.parseElement(verbElement)) as { [key: string]: unknown };
    //in older catalogs (in 4.9) are missing properites: param, security, responseMessage
    await this.decorateVerb(verb, verbElement);

    return verb;
  }

  static async decorateVerb(partial: { [key: string]: unknown }, verbElement: Element) {
    const param = await this.parseParams(verbElement);
    if (param.length > 0) {
      partial['param'] = param;
    }

    const security = await this.transformSecurity(verbElement);
    if (security.length > 0) {
      partial['security'] = security;
    }

    const responseMessages = await this.parseResponseMessages(verbElement);
    if (responseMessages.length > 0) {
      partial['responseMessage'] = responseMessages;
    }
  }

  // Transform the <param> elements inside each verb
  static async parseParams(verbElement: Element): Promise<Param[]> {
    return Promise.all(
      Array.from(verbElement.getElementsByTagName('param')).map(
        async (paramElement) => (await StepParser.parseElement(paramElement)) as Param,
      ),
    );
  }

  // New: Transform <security> elements inside verbs
  static async transformSecurity(verbElement: Element): Promise<RestSecurity[]> {
    return Promise.all(
      Array.from(verbElement.getElementsByTagName('security')).map(
        async (securityElement) => (await StepParser.parseElement(securityElement)) as RestSecurity,
      ),
    );
  }

  // New: Transform <responseMessage> elements inside verbs
  private static async parseResponseMessages(verbElement: Element): Promise<ResponseMessage[]> {
    return Promise.all(
      Array.from(verbElement.getElementsByTagName('responseMessage')).map(async (responseMessageElement) => {
        return (await StepParser.parseElement(responseMessageElement)) as ResponseMessage;
      }),
    );
  }

  private static async parseSecurityDefinitions(restElement: Element): Promise<SecurityDefinitions | undefined> {
    const securityDefinitionsElements = Array.from(
      restElement.getElementsByTagName('securityDefinitions')[0]?.children || [],
    );

    const properties = (await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, 'securityDefinitions'))
      ?.properties?.securityDefinitions;

    if (securityDefinitionsElements.length === 0 || !properties?.oneOf) return undefined;
    let securityDefinitions: SecurityDefinitions = {};

    for (const securityDefinition of securityDefinitionsElements.filter((el) =>
      properties?.oneOf?.includes(el.tagName),
    )) {
      securityDefinitions = {
        ...securityDefinitions,
        [securityDefinition.tagName]: await StepParser.parseElement(securityDefinition),
      };
    }
    return securityDefinitions;
  }

  private static async parseSecurityRequirements(restElement: Element): Promise<RestSecurity[] | undefined> {
    const securityRequirements = restElement.getElementsByTagName('securityRequirements')[0];
    const properties = (await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, 'rest'))?.properties;

    if (securityRequirements && properties?.securityRequirements) {
      return (await StepParser.parseElementsArray(
        'security',
        restElement,
        properties.securityRequirements,
      )) as RestSecurity[];
    }
    return undefined;
  }
}
