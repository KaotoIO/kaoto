import { DocumentDefinitionType } from './document';

export interface IFieldTypeOverride {
  path: string;
  type: string;
}

export interface IDocumentMetadata {
  type: DocumentDefinitionType;
  filePath: string[];
  fieldTypeOverrides?: IFieldTypeOverride[];
}

export interface IDataMapperMetadata {
  xsltPath: string;
  sourceParameters: Record<string, IDocumentMetadata>;
  sourceBody: IDocumentMetadata;
  targetBody: IDocumentMetadata;
  namespaceMap?: Record<string, string>;
}
