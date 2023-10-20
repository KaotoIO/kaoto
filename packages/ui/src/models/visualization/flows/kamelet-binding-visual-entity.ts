import { v4 as uuidv4 } from 'uuid';
import { BaseVisualCamelEntity } from '../base-visual-entity';
import { EntityType } from '../../camel/entities';
import { PipeVisualEntity } from './pipe-visual-entity';
import { KameletBindingSpec } from '../../camel/entities/kamelet-binding-overrides';

/**
 * @deprecated KameletBinding has been renamed to Pipe in Camel K 2.0.
 */
export class KameletBindingVisualEntity extends PipeVisualEntity implements BaseVisualCamelEntity {
  readonly id = uuidv4();
  type = EntityType.KameletBinding;

  constructor(public spec: KameletBindingSpec) {
    super(spec);
  }
}
