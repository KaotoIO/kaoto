import { IField, IMapping } from '../models';

export class MappingService {
  static mappingExists(mappings: IMapping[], sourceField: IField, targetField: IField) {
    return (
      !!mappings &&
      mappings.find((mapping) => {
        return (
          mapping.sourceFields[0]?.fieldIdentifier === sourceField.fieldIdentifier &&
          mapping.targetFields[0]?.fieldIdentifier === targetField.fieldIdentifier
        );
      })
    );
  }

  static createNewMapping(sourceField: IField, targetField: IField) {
    return {
      id: 'mapping-' + Math.floor(Math.random() * 10000),
      name: '',
      sourceFields: [sourceField],
      targetFields: [targetField],
    } as IMapping;
  }
}
