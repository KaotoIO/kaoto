import { v4 as uuidv4 } from 'uuid';

export class Step {
  id = '';
  steps?: Step[];
  [key: string]: unknown;

  /** Internal API fields */
  _id = uuidv4();

  constructor(props: Partial<Step> = {}) {
    Object.assign(this, props);
  }

  /** Internal API methods */
  _getSteps(): Step[] | undefined {
    return this.steps;
  }
}
