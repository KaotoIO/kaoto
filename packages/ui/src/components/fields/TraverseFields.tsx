/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { IAtlasmapGroup } from '../../_bk_atlasmap/Views';
import {
  ITreeGroupAndNodeRefsAndDnDProps,
  TreeGroupAndNodeRefsAndDnD,
  ITreeItemFieldAndNodeRefsAndDnDProps,
  TreeItemWithFieldAndNodeRefsAndDnD,
} from '.';
import { FunctionComponent } from 'react';

import { NodeRef } from '../../_bk_atlasmap/UI';
import { IField } from '../../models';

function getChildrenIds(fields: IField[], idPrefix: string): (string | undefined)[] {
  return fields.reduce<(string | undefined)[]>(
    (ids, f) => [
      ...ids,
      `${idPrefix}${f.id}`,
      ...((f as IAtlasmapGroup).fields ? getChildrenIds((f as IAtlasmapGroup).fields, idPrefix) : []),
    ],
    [],
  );
}

export interface ITraverseFieldsProps extends Omit<Omit<IFieldOrGroupProps, 'field'>, 'fieldId'> {
  fields: IField[];
}

export const TraverseFields: FunctionComponent<ITraverseFieldsProps> = ({
  fields,
  idPrefix,
  isVisible = true,
  ...props
}) => {
  return isVisible ? (
    <>
      {fields.map((field, idx) => (
        <FieldOrGroup
          key={idx}
          field={field}
          idPrefix={idPrefix}
          setSize={fields.length}
          position={idx + 1}
          isVisible={isVisible}
          {...props}
        />
      ))}
    </>
  ) : (
    <NodeRef id={getChildrenIds(fields, idPrefix)} boundaryId={props.boundaryId} parentId={props.parentId}>
      <div>&nbsp;</div>
    </NodeRef>
  );
};

export interface IFieldOrGroupProps
  extends Omit<Omit<ITreeItemFieldAndNodeRefsAndDnDProps, 'field'>, 'fieldId'>,
    Omit<Omit<Omit<ITreeGroupAndNodeRefsAndDnDProps, 'group'>, 'fieldId'>, 'children'> {
  idPrefix: string;
  field: IAtlasmapGroup | IField;
  isVisible?: boolean;
}

const FieldOrGroup: FunctionComponent<IFieldOrGroupProps> = ({ field, idPrefix, level = 1, ...props }) => {
  const fieldId = `${idPrefix}${field.id}`;
  const maybeGroup = field as IAtlasmapGroup;
  const maybeField = field as IField;
  if (maybeGroup.fields) {
    return (
      <TreeGroupAndNodeRefsAndDnD fieldId={fieldId} group={maybeGroup} level={level} {...props}>
        {({ expanded }) => (
          <TraverseFields
            {
              ...props /* spreading the props must be done before everything else so to override the values fed to the Group */
            }
            fields={maybeGroup.fields as IField[]}
            parentId={fieldId}
            level={level + 1}
            idPrefix={idPrefix}
            isVisible={expanded}
          />
        )}
      </TreeGroupAndNodeRefsAndDnD>
    );
  }
  return <TreeItemWithFieldAndNodeRefsAndDnD fieldId={fieldId} field={maybeField} level={level} {...props} />;
};
