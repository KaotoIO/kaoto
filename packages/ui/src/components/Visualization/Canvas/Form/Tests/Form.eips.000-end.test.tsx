// NOSONAR typescript:S2187 - Tests are defined in FormTest function
import { CatalogKind } from '../../../../../models';
import { FormTest } from './FormTest';

const target = { kind: CatalogKind.Pattern, range: { start: 0, end: undefined } } as const;

describe(`Form: ${target.kind} - [${target.range.start} - ${target.range.end}]`, () => {
  FormTest(target);
});
