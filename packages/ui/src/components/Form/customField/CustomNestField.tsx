/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Card, CardBody, CardHeader, CardTitle, ExpandableSection, capitalize } from '@patternfly/react-core';
import { useMemo } from 'react';
import { HTMLFieldProps, connectField, filterDOMProps } from 'uniforms';
import { getValue } from '../../../utils';
import { CustomAutoField } from '../CustomAutoField';
import './CustomNestField.scss';

export type CustomNestFieldProps = HTMLFieldProps<
  object,
  HTMLDivElement,
  { properties?: Record<string, unknown>; helperText?: string; itemProps?: object }
>;

export const CustomNestField = connectField(
  ({
    children,
    error,
    errorMessage,
    fields,
    itemProps,
    label,
    name,
    showInlineError,
    disabled,
    ...props
  }: CustomNestFieldProps) => {
    const propertiesArray = useMemo(() => {
      return Object.entries(props.properties ?? {}).reduce(
        (acc, [name, definition]) => {
          const group: string = getValue(definition, 'group', '');
          if (group === '' || group === 'common' || group === 'producer' || group === 'consumer') {
            acc.common.push(name);
          } else if (group.includes('advanced')) {
            acc.groups['advanced'] ??= [];
            acc.groups['advanced'].push(name);
          } else {
            acc.groups[group] ??= [];
            acc.groups[group].push(name);
          }
          return acc;
        },
        { common: [], groups: {} } as { common: string[]; groups: Record<string, string[]> },
      );
    }, [props.properties]);

    return (
      <Card data-testid={'nest-field'} {...filterDOMProps(props)}>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardBody className="custom-nestfield-spacing">
          {propertiesArray.common.map((field) => (
            <CustomAutoField key={field} name={field} />
          ))}
        </CardBody>

        {Object.entries(propertiesArray.groups).map(([groupName, groupFields]) => (
          <ExpandableSection
            key={`${groupName}-section-toggle`}
            toggleText={capitalize(`${groupName} properties`)}
            toggleId="expandable-section-toggle"
            contentId="expandable-section-content"
          >
            <CardBody className="custom-nestfield-spacing">
              {groupFields.map((field) => (
                <CustomAutoField key={field} name={field} />
              ))}
            </CardBody>
          </ExpandableSection>
        ))}
      </Card>
    );
  },
);
