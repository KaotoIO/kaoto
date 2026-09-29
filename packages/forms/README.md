<h1 align="center">
  <a href="https://kaoto.io/"><img style="width: 400px;" src="./src/assets/logo-kaoto.png" alt="A picture showing the Kaoto graphical editor showing an integration with the configuration panel opened"/></a>
</h1>

<p align=center>
  <a href="https://github.com/KaotoIO/kaoto/blob/main/LICENSE"><img src="https://img.shields.io/github/license/KaotoIO/kaoto?color=blue&style=for-the-badge" alt="License"/></a>
  <a href="https://www.youtube.com/@KaotoIO"><img src="https://img.shields.io/badge/Youtube-Follow-brightgreen?color=red&style=for-the-badge" alt="Youtube"" alt="Follow on Youtube"></a>
  <a href="https://camel.zulipchat.com/#narrow/stream/441302-kaoto"><img src="https://img.shields.io/badge/zulip-join_chat-brightgreen?color=yellow&style=for-the-badge" alt="Zulip"/></a>
  <a href="https://kaoto.io"><img src="https://img.shields.io/badge/Kaoto.io-Visit-white?color=indigo&style=for-the-badge" alt="Zulip"/></a>
</p><br/>

<h2 align="center">Kaoto - The Integration Designer for <a href="https://camel.apache.org">Apache Camel</a></h2>

<p align="center">
  <a style="font-weight: bold" href="https://kaoto.io/docs/installation">Documentation</a> |
  <a style="font-weight: bold" href="https://kaoto.io/workshop/">Workshops</a> |
  <a style="font-weight: bold" href="https://kaoto.io/contribute/">Contribute</a> |
  <a style="font-weight: bold" href="https://camel.zulipchat.com/#narrow/stream/441302-kaoto">Chat</a>
</p>

# Kaoto forms

Kaoto forms are a library of reusable components that can be used to build forms in the Kaoto UI. They are designed to be flexible and easy to use, adapted to Apache Camel component schemas, allowing developers to create forms that can be used in different contexts.

# Getting started

```jsx
import { KaotoForm } from '@kaoto/forms';

const schema = {
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
  // Add more properties as needed
};

const handleOnChangeIndividualProp = (path: string, value: unknown) => {
  console.log(`Property ${prop} changed to ${value}`);
  // Handle the change event as needed
};

const onChange = (value: unknown) => {
  console.log('Form changed:', value);
  // Handle the form change event as needed
};

<KaotoForm
  schema={schema}
  model={model}
  onChangeProp={handleOnChangeIndividualProp}
  onChange={onChange}
/>
```

# Screenshots

<p align="center">
  <img style="width: 400px;" src="./src/assets/kaoto-form.png" alt="A picture showing the Kaoto form"/>
</p>
