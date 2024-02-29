import { AlertProps } from '@patternfly/react-core';
import { ITransformationArgument, ITransformationSelectOption } from '../_bk_atlasmap/UI';
import { Field, MappingModel } from '../_bk_atlasmap/core';

export type CanvasView = 'SourceTarget' | 'MappingTable' | 'NamespaceTable';

export interface INotification {
  id: string;
  variant: AlertProps['variant'];
  title: string;
  description: string;
  isRead?: boolean;
  mappingId?: string;
}

export interface IDocument {
  id: string;
  name: string;
  type: string;
  fields: IField[];
  namespaces?: INamespace[];
}

export interface INamespace {
  alias: string;
  uri: string;
  locationUri: string;
  isTarget: boolean;
}

export interface IMappedField extends IField {
  transformations: Array<{
    name: string;
    options: ITransformationSelectOption[];
    arguments: ITransformationArgument[];
  }>;
}

export interface IMapping {
  id: string;
  name: string;
  sourceFields: IMappedField[];
  targetFields: IMappedField[];
}

export interface IField {
  id: string;
  name: string;
  type: string;
  scope: string;
  value: string;
  path: string;
  mappings: IMapping[];
  hasTransformations: boolean;
  isAttribute: boolean;
  isCollection: boolean;
  isConnected: boolean;
  isInCollection: boolean;
  isDisabled: boolean;
  enumeration: boolean;
}

export interface IAtlasmapGroup {
  id: string;
  fields: (IField | IAtlasmapGroup)[];
  name: string;
  type: string;
  isCollection: boolean;
  isInCollection: boolean;
}

export interface IAtlasmapField {
  id: string;
  name: string;
  type: string;
  scope: string;
  value: string;
  path: string;
  mappings: IAtlasmapMapping[];
  hasTransformations: boolean;
  isAttribute: boolean;
  isCollection: boolean;
  isConnected: boolean;
  isInCollection: boolean;
  isDisabled: boolean;
  enumeration: boolean;

  // TODO: find a way to remove this maybe?
  amField: Field;
}

export interface IAtlasmapMappedField extends IAtlasmapField {
  transformations: Array<{
    name: string;
    options: Array<ITransformationSelectOption>;
    arguments: Array<ITransformationArgument>;
  }>;
}

export interface IAtlasmapMapping {
  id: string;
  name: string;
  sourceFields: Array<IAtlasmapMappedField>;
  targetFields: Array<IAtlasmapMappedField>;
  mapping: MappingModel;
}
