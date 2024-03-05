import { generateRandomId } from '../util';
import { IField } from './document';

export interface IMappedField extends IField {
  transformations: Array<{
    name: string;
  }>;
}

export interface IMapping {
  id: string;
  name: string;
  sourceFields: IMappedField[];
  targetFields: IMappedField[];
}

export class Mapping implements IMapping {
  id: string = generateRandomId('mapping');
  name: string = '';
  sourceFields: IMappedField[] = [];
  targetFields: IMappedField[] = [];
}
