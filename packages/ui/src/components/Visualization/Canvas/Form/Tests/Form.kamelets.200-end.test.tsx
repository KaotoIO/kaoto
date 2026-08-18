import { CatalogKind } from '../../../../../models';
import { FormTest } from './FormTest';

const target = { kind: CatalogKind.Kamelet, range: { start: 200, end: undefined } } as const;

describe(`Form: ${target.kind} - [${target.range.start} - ${target.range.end}]`, () => {
  // NOSONAR typescript:S2187 - Tests are defined in FormTest function
  FormTest(target);
});
