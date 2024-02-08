import { AlertProps } from '@patternfly/react-core';
import { ElementId } from '../_bk_atlasmap/Views';
import { ITransformationArgument, ITransformationSelectOption } from '../_bk_atlasmap/UI';

export type CanvasView = 'SourceTarget' | 'MappingTable' | 'NamespaceTable';

export type SourceOrTarget = 'source' | 'target';

export interface INotification {
  id: string;
  variant: AlertProps['variant'];
  title: string;
  description: string;
  isRead?: boolean;
  mappingId?: string;
}

export interface IDataMapperContext {
  loading: boolean;
  activeView: CanvasView;
  setActiveView(view: CanvasView): void;
  notifications: INotification[];
  constants: IDocument;
  sourceProperties: IDocument;
  targetProperties: IDocument;
  sources: IDocument[];
  targets: IDocument[];
  mappings: IMapping[];
  setMappings(mappings: IMapping[]): void;
  selectedMapping: IMapping | null;
  setSelectedMapping(mapping: IMapping | null): void;
  isPreviewEnabled: boolean;
  togglePreview(): void;
  showTypes: boolean;
  toggleShowTypes(): void;
  showMappedFields: boolean;
  toggleShowMappedFields(): void;
  showUnmappedFields: boolean;
  toggleShowUnmappedFields(): void;
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
  id: ElementId;
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
