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

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { BeansXmlSerializer } from './beans-xml-serializer';
import { getDocument, testSerializer } from './serializer-test-utils';

describe('BeanXmlParser', () => {
  const doc = getDocument();
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  it('parse bean constructors properly', async () => {
    const entity = {
      name: 'beanFromProps',
      type: 'com.acme.MyBean',
      builderClass: 'com.acme.MyBeanBuilder',
      builderMethod: 'createMyBean',
      constructors: { '0': 'true', '1': 'Hello World' },
      properties: { field1: 'f1_p', field2: 'f2_p', 'nested.field1': 'nf1_p', 'nested.field2': 'nf2_p' },
    };
    const expected = `<bean name="beanFromProps" type="com.acme.MyBean" builderClass="com.acme.MyBeanBuilder" builderMethod="createMyBean">
  <constructors>
    <constructor index="0" value="true"/>
    <constructor index="1" value="Hello World"/>
  </constructors>
  <properties>
    <property key="field1" value="f1_p"/>
    <property key="field2" value="f2_p"/>
    <property key="nested.field1" value="nf1_p"/>
    <property key="nested.field2" value="nf2_p"/>
  </properties>
</bean>`;

    const bean = await BeansXmlSerializer.serialize(entity, doc);
    expect(bean).toBeDefined();
    testSerializer(expected, bean!);
  });

  it('parse bean properties properly', async () => {
    const bean = {
      name: 'beanFromProps',
      type: 'com.acme.MyBean',
      builderClass: 'com.acme.MyBeanBuilder',
      builderMethod: 'createMyBean',
      properties: { field1: 'f1_p', field2: { nested1: 'p2', nested2: { nested3: 'value' } } },
    };

    const result = await BeansXmlSerializer.serialize(bean, doc);
    const expected = `<bean name="beanFromProps" 
      type="com.acme.MyBean" builderClass="com.acme.MyBeanBuilder" builderMethod="createMyBean">
  <properties>
    <property key="field1" value="f1_p"/>
    <property key="field2.nested1" value="p2"/>
    <property key="field2.nested2.nested3" value="value"/>
  </properties>
</bean>`;
    expect(result).toBeDefined();
    testSerializer(expected, result!);
  });

  it('serializes nested properties once and preserves dotted paths and order', () => {
    const properties = {
      person: {
        name: 'John',
        lastname: 'Connor',
        address: {
          city: 'Bengaluru',
          country: 'India',
        },
        age: 30,
      },
      active: true,
    };
    const expected = `<properties>
  <property key="person.name" value="John"/>
  <property key="person.lastname" value="Connor"/>
  <property key="person.address.city" value="Bengaluru"/>
  <property key="person.address.country" value="India"/>
  <property key="person.age" value="30"/>
  <property key="active" value="true"/>
</properties>`;

    const result = BeansXmlSerializer.serializeProperties(properties, doc);

    testSerializer(expected, result);
  });

  it.each([
    {
      level: 'direct',
      properties: { name: 'John', age: null, missing: undefined },
      expected: `<properties>
  <property key="name" value="John"/>
</properties>`,
    },
    {
      level: 'nested',
      properties: {
        person: {
          name: 'John',
          age: null,
          missing: undefined,
          address: { city: 'Bengaluru', unit: null, pincode: undefined },
        },
      },
      expected: `<properties>
  <property key="person.name" value="John"/>
  <property key="person.address.city" value="Bengaluru"/>
</properties>`,
    },
  ])('omits null and undefined values in $level properties', ({ properties, expected }) => {
    const result = BeansXmlSerializer.serializeProperties(properties, doc);

    testSerializer(expected, result);
  });

  it('preserves zero, false, and empty strings in direct and nested properties', () => {
    const properties = {
      count: 0,
      enabled: false,
      text: '',
      nested: { count: 0, enabled: false, text: '' },
    };
    const expected = `<properties>
  <property key="count" value="0"/>
  <property key="enabled" value="false"/>
  <property key="text" value=""/>
  <property key="nested.count" value="0"/>
  <property key="nested.enabled" value="false"/>
  <property key="nested.text" value=""/>
</properties>`;

    const result = BeansXmlSerializer.serializeProperties(properties, doc);

    testSerializer(expected, result);
  });

  it('returns empty properties when all direct and nested values are omitted', () => {
    const properties = {
      age: null,
      missing: undefined,
      person: { age: null, missing: undefined },
    };

    const result = BeansXmlSerializer.serializeProperties(properties, doc);

    testSerializer('<properties/>', result);
  });

  it('handle undefined constructors properly', () => {
    const constructors = {
      '0': 'true',
      '1': undefined,
      '2': 'Hello World',
    };

    // with undefined for constructors I went with the empty string instead of omit the element to keep the index
    const expected = `<constructors>
  <constructor index="0" value="true"/>
  <constructor index="1" value=""/>
  <constructor index="2" value="Hello World"/>
</constructors>`;

    const result = BeansXmlSerializer.serializeConstructors(constructors, doc);
    expect(result).toBeDefined();
    testSerializer(expected, result);
  });

  it('handles undefined  values properly', () => {
    const properties = {
      field1: 'value',
      field2: undefined,
      field3: {
        nested1: 'valid',
        nested2: undefined,
      },
    };

    const result = BeansXmlSerializer.serializeProperties(properties, doc);
    const expected = `
  <properties>
    <property key="field1" value="value"/>
   <property key="field3.nested1" value="valid"/>
 </properties>`;

    expect(result).toBeDefined();
    testSerializer(expected, result);
  });
});
