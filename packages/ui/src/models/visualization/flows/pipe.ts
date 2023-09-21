import { Pipe as PipeModel } from '@kaoto-next/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';
import { BaseVisualCamelEntity } from '../base-visual-entity';
import { EntityType } from '../../camel-entities/base-entity';
import { KameletBinding } from './kamelet-binding';

export class Pipe extends KameletBinding implements BaseVisualCamelEntity {
  readonly id = uuidv4();
  type = EntityType.Pipe;

  constructor(public route: Partial<PipeModel> = {}) {
    super();
  }
}
