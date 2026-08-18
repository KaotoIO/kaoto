import { CatalogKind } from '../../../../../models';
import { FormTest } from './FormTest';

const target = { kind: CatalogKind.Component, range: { start: 250, end: 300 } } as const;

describe(`Form: ${target.kind} - [${target.range.start} - ${target.range.end}]`, () => {
  // NOSONAR typescript:S2187 - Tests are defined in FormTest function
  FormTest(target);
});
