import { IMappedField, IMapping } from './api';
import { generateRandomId } from '../util';

export class Mapping implements IMapping {
  id: string = generateRandomId('mapping');
  name: string = '';
  sourceFields: IMappedField[] = [];
  targetFields: IMappedField[] = [];
}
