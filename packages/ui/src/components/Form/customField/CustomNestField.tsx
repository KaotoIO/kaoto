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

import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { useContext } from 'react';
import { HTMLFieldProps, connectField, filterDOMProps } from 'uniforms';
import { getFieldGroups } from '../../../utils';
import { CustomAutoField } from '../CustomAutoField';
import './CustomNestField.scss';
import { FilteredFieldContext } from '../../../providers';
import { CustomExpandableSection } from './CustomExpandableSection';

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
    const { filteredFieldText, isGroupExpanded } = useContext(FilteredFieldContext);
    const cleanQueryTerm = filteredFieldText.replace(/\s/g, '').toLowerCase();
    const filteredProperties = Object.entries(props.properties ?? {}).filter((field) =>
      field[0].toLowerCase().includes(cleanQueryTerm),
    );
    const actualProperties = Object.fromEntries(filteredProperties);
    const propertiesArray = getFieldGroups(actualProperties);

    if (propertiesArray.common.length === 0 && Object.keys(propertiesArray.groups).length === 0) return null;

    return (
      <Card isFlat className="custom-nest-field" data-testid={'nest-field'} {...filterDOMProps(props)}>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardBody>
          {propertiesArray.common.map((field) => (
            <CustomAutoField key={field} name={field} />
          ))}
        </CardBody>

        {Object.entries(propertiesArray.groups)
          .sort((a, b) => (a[0] === 'advanced' ? 1 : b[0] === 'advanced' ? -1 : 0))
          .map(([groupName, groupFields]) => (
            <CustomExpandableSection
              key={`${groupName}-section-toggle`}
              groupName={groupName}
              isGroupExpanded={isGroupExpanded}
            >
              <CardBody>
                {groupFields.map((field) => (
                  <CustomAutoField key={field} name={field} />
                ))}
              </CardBody>
            </CustomExpandableSection>
          ))}
      </Card>
    );
  },
);
