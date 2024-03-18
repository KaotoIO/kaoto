import { generateRandomId } from '../util';
import { IField } from './document';

export interface ITransformation {
  name: string;
}

export interface IMapping {
  id: string;
  name: string;
  sourceFields: IField[];
  targetFields: IField[];
  transformations: ITransformation[];
}

export class Mapping implements IMapping {
  id: string = generateRandomId('mapping');
  name: string = '';
  sourceFields: IField[] = [];
  targetFields: IField[] = [];
  transformations: ITransformation[] = [];
}
