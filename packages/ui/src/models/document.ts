import { IDocument, IField } from './api';
import { generateRandomId } from '../util';

export class Document implements IDocument {
  fields: IField[] = [];
  id: string = generateRandomId('document');
  name: string = '';
  type: string = '';
}
