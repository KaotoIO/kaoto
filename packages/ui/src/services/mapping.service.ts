import { IField, IMapping } from '../models';

export class MappingService {
  static mappingExists(mappings: IMapping[], sourceField: IField, targetField: IField) {
    return (
      !!mappings &&
      mappings.find((mapping) => {
        return mapping.sourceFields[0]?.path === sourceField.path && mapping.targetFields[0]?.path === targetField.path;
      })
    );
  }

  static createNewMapping(sourceField: IField, targetField: IField) {
    return {
      id: 'mapping-' + Math.random(),
      name: '',
      sourceFields: [sourceField],
      targetFields: [targetField],
    } as IMapping;
  }
}
