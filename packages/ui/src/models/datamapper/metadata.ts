import { DocumentDefinitionType } from './document';

export interface IDocumentMetadata {
  type: DocumentDefinitionType;
  filePath: string[];
}

export interface IDataMapperMetadata {
  xsltPath: string;
  sourceParameters: Record<string, IDocumentMetadata>;
  sourceBody: IDocumentMetadata;
  targetBody: IDocumentMetadata;
}
