<h1 align="center">
  <a href="https://kaoto.io/"><img style="width: 400px;" src="../ui/src/assets/logo-kaoto.png" alt="Kaoto"/></a>
</h1>

<p align=center>
  <a href="https://github.com/KaotoIO/kaoto/blob/main/LICENSE"><img src="https://img.shields.io/github/license/KaotoIO/kaoto?color=blue&style=for-the-badge" alt="License"/></a>
  <a href="https://www.youtube.com/@KaotoIO"><img src="https://img.shields.io/badge/Youtube-Follow-brightgreen?color=red&style=for-the-badge" alt="Follow on Youtube"></a>
  <a href="https://camel.zulipchat.com/#narrow/stream/441302-kaoto"><img src="https://img.shields.io/badge/zulip-join_chat-brightgreen?color=yellow&style=for-the-badge" alt="Zulip"/></a>
  <a href="https://kaoto.io"><img src="https://img.shields.io/badge/Kaoto.io-Visit-white?color=indigo&style=for-the-badge" alt="Kaoto.io"/></a>
</p><br/>

<h2 align="center">Kaoto - The Integration Designer for <a href="https://camel.apache.org">Apache Camel</a></h2>

<p align="center">
  <a style="font-weight: bold" href="https://kaoto.io/docs/installation">Documentation</a> |
  <a style="font-weight: bold" href="https://kaoto.io/workshop/">Workshops</a> |
  <a style="font-weight: bold" href="https://kaoto.io/contribute/">Contribute</a> |
  <a style="font-weight: bold" href="https://camel.zulipchat.com/#narrow/stream/441302-kaoto">Chat</a>
</p>

# Kaoto forms

Kaoto forms (`@kaoto/forms`) is a library of reusable React components to build forms from a JSON schema. It is designed to be flexible and easy to use, and it is adapted to Apache Camel component schemas. The UI is built with the [Carbon Design System](https://carbondesignsystem.com/).

# Installation

```bash
yarn add @kaoto/forms
```

The library does not bundle its UI dependencies. Install the following peer dependencies in your application:

- `react` and `react-dom`
- `@carbon/react`
- `@carbon/styles`
- `@carbon/icons-react`
- `@carbon/ibm-products`

See [`package.json`](./package.json) for the supported version ranges.

# Getting started

```tsx
import { KaotoForm } from '@kaoto/forms';
import { JSONSchema4 } from 'json-schema';

const schema: JSONSchema4 = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      description: 'The name of the integration',
    },
    description: {
      type: 'string',
      title: 'Description',
      description: 'A brief description of the integration',
    },
    // Add more properties as needed
  },
};

const model = {
  name: 'My Integration',
  description: 'This is a sample integration',
};

export const MyForm = () => {
  const handleOnChangeProp = (propName: string, value: unknown) => {
    console.log(`Property ${propName} changed to`, value);
  };

  const handleOnChange = (value: unknown) => {
    console.log('Form changed:', value);
  };

  return <KaotoForm schema={schema} model={model} onChangeProp={handleOnChangeProp} onChange={handleOnChange} />;
};
```

# `KaotoForm` props

| Prop                  | Type                                                                  | Description                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`              | `JSONSchema4`                                                         | The JSON schema describing the form. **Required**: the component throws if it is not provided.                                              |
| `model`               | `unknown`                                                             | The current value of the form. The form re-syncs whenever a new `model` reference is provided.                                              |
| `onChange`            | `(value: unknown) => void`                                            | Called with the whole updated model every time the user edits the form. It is not called when the consumer provides a new `model`.          |
| `onChangeProp`        | `(propName: string, value: unknown) => void`                          | Called with the path and the new value of the individual property that changed.                                                             |
| `omitFields`          | `string[]`                                                            | Property names to hide from the form. Defaults to `[]`.                                                                                     |
| `disabled`            | `boolean`                                                             | Disables all the form fields.                                                                                                               |
| `withLayer`           | `boolean`                                                             | Wraps the form in a Carbon `<Layer>` when no ancestor provides one, so the inputs don't blend with the page background. Defaults to `true`. |
| `customFieldsFactory` | `(schema: JSONSchema4) => FunctionComponent<FieldProps> \| undefined` | Overrides the field selection. Return a custom field component for a given schema, or `undefined` to use the default one.                   |
| `data-testid`         | `string`                                                              | Test id set on the form element.                                                                                                            |

## Validating the form

`KaotoForm` forwards a ref exposing a `validate()` method. It validates the current model against the schema, displays the errors in the form and returns them, or `null` when the model is valid.

```tsx
import { KaotoForm, KaotoFormApi } from '@kaoto/forms';
import { useRef } from 'react';

export const MyForm = () => {
  const formRef = useRef<KaotoFormApi>(null);

  const onSave = () => {
    const errors = formRef.current?.validate(); // Record<string, string[]> | null
    if (errors === null) {
      // The model is valid
    }
  };

  return <KaotoForm ref={formRef} schema={schema} model={model} />;
};
```

# Other exports

Besides `KaotoForm`, the package exports the building blocks used to compose it:

- **Fields**: the individual field components, such as `AutoField`.
- **`Typeahead`** and **`KeyValue`** components.
- **Hooks**: for example, `useFieldValue` and the `oneOf` helpers.
- **Providers**: model, schema, field-filtering, canvas form tabs and form component factory providers, plus `SuggestionRegistryProvider` and the suggestions API to offer value suggestions in the fields.
- **Utilities**: helpers to work with schemas and models, and the validation helpers `getValidator` and `errorsMapper`.

# Testing helpers

Two additional entry points help to test components that render Kaoto forms. They rely on [Vitest](https://vitest.dev/), so they are only intended for Vitest-based test suites.

```ts
import { FieldTestProvider, FormWrapper } from '@kaoto/forms/testing';
import { KaotoFormPageObject } from '@kaoto/forms/testing/page-object';
```

# Development

This package lives in the [Kaoto monorepo](https://github.com/KaotoIO/kaoto) under `packages/forms`. It is currently excluded from the root Yarn workspaces (see the root `package.json`), so run the commands from this folder:

```bash
npx vitest run --config vitest.config.mts                  # run the unit tests
npx tsc --noEmit --project tsconfig.json                   # type-check the sources
npx eslint "src/**/*.{ts,tsx}"                             # lint the sources
npx rimraf dist && npx tsc --project tsconfig.lib.json \
  && npx copyfiles -u 1 "./src/**/*.scss" ./dist           # build the library into ./dist
```

Dependencies are installed from the repository root with `yarn install`.
