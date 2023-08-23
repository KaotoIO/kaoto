import { v4 as uuidv4 } from 'uuid';

/** This is the enum with the registered Camel entities supported by Kaoto */
export const enum EntityType {
  Route = 'route',
  Step = 'step',
}

/** This is the combination type of the registered Camel entities supported by Kaoto */
export type CamelEntities = BaseCamelEntity;

export abstract class BaseCamelEntity {
  abstract id: string;
  abstract name: string;

  /** Internal API fields */
  abstract readonly _id: string;
  abstract readonly _type: EntityType;
}

export class CamelRoute implements BaseCamelEntity {
  id = '';
  name = '';

  readonly _id = uuidv4();
  readonly _type = EntityType.Route;

  steps: Step[] = [];

  updateModel(props: Partial<unknown> = {}) {
    Object.assign(this, props);
  }

  _addStep(step: Step): void {
    this.steps.push(step);
  }

  _getSteps(): Step[] {
    return this.steps;
  }
}

export class Step implements BaseCamelEntity {
  id = '';
  name = '';
  steps: Step[] = [];

  /** Internal API fields */
  _id = uuidv4();
  _type = EntityType.Step;

  constructor(props: Partial<Step> = {}) {
    Object.assign(this, props);
  }

  /** Internal API methods */
  _getSteps(): Step[] {
    return this.steps;
  }
}
