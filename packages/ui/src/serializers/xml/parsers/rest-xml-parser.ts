/*
 * Copyright (C) 2023 Red Hat, Inc.
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
import { extractAttributesFromXmlElement } from '../xml-utils';
import { CamelCatalogService, CatalogKind } from '../../../models';
import { RouteXmlParser } from './route-xml-parser';
import { StepParser } from './step-parser';

export class RestXmlParser {
  routeXmlParser = new RouteXmlParser();

  // Main transformation for <rest> elements
  static parse(restElement: Element): Rest {
    const properties = CamelCatalogService.getComponent(CatalogKind.Processor, 'rest')?.properties;

    return {
      ...extractAttributesFromXmlElement(restElement, properties),
      ...this.parseRestVerbs(restElement),
      securityDefinitions: this.parseSecurityDefinitions(restElement) as unknown as SecurityDefinitions,
      securityRequirements: this.parseSecurityRequirements(restElement),
    };
  }

  // Transform verbs like <get>, <post>, etc.
  private static parseRestVerbs(restElement: Element): Rest {
    const verbs: { [key: string]: unknown } = {};
    const verbNames = ['get', 'post', 'put', 'delete', 'patch', 'head'];

    // For each verb, look for its elements and transform them
    verbNames.forEach((verb) => {
      const verbInstances = Array.from(restElement.getElementsByTagName(verb));
      if (verbInstances.length > 0) {
        verbs[verb] = verbInstances.map((verbElement: Element) => this.parseRestVerb(verbElement));
      }
    });

    return verbs as unknown as Rest;
  }

  static parseRestVerb(verbElement: Element) {
    const verb = StepParser.parseElement(verbElement) as { [key: string]: unknown };
    //in older catalogs (in 4.9) are missing properites: param, security, responseMessage
    this.decorateVerb(verb, verbElement);

    return verb;
  }

  static decorateVerb(partial: { [key: string]: unknown }, verbElement: Element) {
    const param = this.parseParams(verbElement);
    if (param.length > 0) {
      partial['param'] = param;
    }

    const security = this.transformSecurity(verbElement);
    if (security.length > 0) {
      partial['security'] = security;
    }

    const responseMessages = this.parseResponseMessages(verbElement);
    if (responseMessages.length > 0) {
      partial['responseMessage'] = responseMessages;
    }
  }

  // Transform the <param> elements inside each verb
  static parseParams(verbElement: Element): Param[] {
    return Array.from(verbElement.getElementsByTagName('param')).map(
      (paramElement) => StepParser.parseElement(paramElement) as Param,
    );
  }

  // New: Transform <security> elements inside verbs
  static transformSecurity(verbElement: Element): RestSecurity[] {
    return Array.from(verbElement.getElementsByTagName('security')).map(
      (securityElement) => StepParser.parseElement(securityElement) as RestSecurity,
    );
  }

  // New: Transform <responseMessage> elements inside verbs
  private static parseResponseMessages(verbElement: Element): ResponseMessage[] {
    return Array.from(verbElement.getElementsByTagName('responseMessage')).map((responseMessageElement) => {
      return StepParser.parseElement(responseMessageElement) as ResponseMessage;
    });
  }

  private static parseSecurityDefinitions(restElement: Element): SecurityDefinitions | undefined {
    const securityDefinitionsElements = Array.from(
      restElement.getElementsByTagName('securityDefinitions')[0]?.children || [],
    );

    const properties = CamelCatalogService.getComponent(CatalogKind.Processor, 'securityDefinitions')?.properties
      .securityDefinitions;

    let securityDefinitions: SecurityDefinitions = {};
    if (securityDefinitionsElements.length === 0) return undefined;
    securityDefinitionsElements
      .filter((el) => properties?.oneOf?.includes(el.tagName))
      .forEach((securityDefinition) => {
        securityDefinitions = {
          ...securityDefinitions,
          [securityDefinition.tagName]: StepParser.parseElement(securityDefinition),
        };
      });
    return securityDefinitions;
  }

  private static parseSecurityRequirements(restElement: Element): RestSecurity[] | undefined {
    const securityRequirements = restElement.getElementsByTagName('securityRequirements')[0];
    const properties = CamelCatalogService.getComponent(CatalogKind.Processor, 'rest')?.properties;

    if (securityRequirements) {
      StepParser.parseElementsArray('security', restElement, properties!.securityRequirements);
    }
    return undefined;
  }
}
