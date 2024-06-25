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

import { connectField, filterDOMProps, HTMLFieldProps } from 'uniforms';
import { Card, CardBody } from '@patternfly/react-core';
import { AutoField, wrapField } from '@kaoto-next/uniforms-patternfly';
import { ExpressionModalLauncher } from './ExpressionModalLauncher';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ICamelLanguageDefinition } from '../../../models';
import { ExpressionService } from './expression.service';
import { getSerializedModel } from '../../../utils';

export type NestFieldProps = HTMLFieldProps<object, HTMLDivElement, { helperText?: string; itemProps?: object }>;

export const ExpressionAwareNestField = connectField(
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
  }: NestFieldProps) => {
    const languageCatalogMap = useMemo(() => {
      return ExpressionService.getLanguageMap();
    }, []);
    const [preparedLanguage, setPreparedLanguage] = useState<ICamelLanguageDefinition>();
    const [preparedModel, setPreparedModel] = useState<Record<string, unknown> | undefined>({});

    const resetModel = useCallback(() => {
      const { language, model: expressionModel } = ExpressionService.parseStepExpressionModel(
        languageCatalogMap,
        props.value as Record<string, unknown>,
      );
      setPreparedLanguage(language);
      setPreparedModel(expressionModel);
    }, [languageCatalogMap, props.value]);

    useEffect(() => {
      resetModel();
    }, [resetModel]);

    const handleChange = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (languageName: string, model: any) => {
        const language = ExpressionService.getDefinitionFromModelName(languageCatalogMap, languageName);
        setPreparedLanguage(language);
        setPreparedModel(getSerializedModel(model));
      },
      [languageCatalogMap],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleConfirm = useCallback(() => {
      if (preparedLanguage && preparedModel) {
        ExpressionService.setStepExpressionModel(
          languageCatalogMap,
          props.value as Record<string, unknown>,
          preparedLanguage?.model.name,
          preparedModel,
        );
        props.onChange(props.value);
      }
    }, [languageCatalogMap, preparedLanguage, preparedModel, props]);

    const handleCancel = useCallback(() => {
      resetModel();
    }, [resetModel]);

    return (
      <Card data-testid={'nest-field'} {...filterDOMProps(props)}>
        <CardBody className="pf-c-form">
          {label && (
            <label>
              <b>{label}</b>
            </label>
          )}
          {wrapField(
            { id: 'expression-wrapper', ...itemProps },
            <ExpressionModalLauncher
              name={name}
              title={label?.toString() || name}
              language={preparedLanguage}
              model={preparedModel}
              onChange={handleChange}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />,
          )}
          {children ||
            fields?.map((field) => <AutoField key={field} disabled={disabled} name={field} {...itemProps} />)}
        </CardBody>
      </Card>
    );
  },
);
