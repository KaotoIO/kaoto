import { FunctionComponent, useState } from 'react';
import { Form, FormGroup, FormSelect, FormSelectOption, TextInput, ActionGroup, Button } from '@patternfly/react-core';

export const ConfigForm: FunctionComponent = () => {
  const [component, setComponent] = useState('');
  const [contextPath, setContextPath] = useState('');
  const [port, setPort] = useState('');
  const [bindingMode, setBindingMode] = useState('');
  const [host, setHost] = useState('');

  const componentOptions = [
    { value: 'Select component', label: 'Select component', disabled: false },
    { value: 'platform-http', label: 'platform-http', disabled: false },
    { value: 'servlet', label: 'servlet', disabled: false },
    { value: 'jetty', label: 'jetty', disabled: false },
    { value: 'undertow', label: 'undertow', disabled: false },
    { value: 'netty-http', label: 'netty-http', disabled: false },
    { value: 'coap', label: 'coap', disabled: false }
  ];

  const bindingModeOptions = [
    { value: 'Select component', label: 'Select component', disabled: false },
    { value: 'off', label: 'off', disabled: false },
    { value: 'auto', label: 'auto', disabled: false },
    { value: 'json', label: 'json', disabled: false },
    { value: 'xml', label: 'xml', disabled: false },
    { value: 'json_xml', label: 'json_xml', disabled: false },
  ];

  const handleComponentChange = (_event, componentName: string) => {
    setComponent(componentName);
  };

  const handleContextPathChange = (_event, contextPathName: string) => {
    setContextPath(contextPathName);
  };

  const handlePortChange = (_event, portNumber: string) => {
    setPort(portNumber);
  };

  const handleBindingModeChange = (_event, bindingModeName: string) => {
    setBindingMode(bindingModeName);
  };

  const handleHostChange = (_event, hostName: string) => {
    setHost(hostName);
  };

  return (
    <Form>
      <FormGroup label="Component" isRequired fieldId="component">
        <FormSelect
          value={component}
          onChange={handleComponentChange}
          aria-label="FormSelect Input"
          ouiaId="BasicFormSelect"
        >
          {componentOptions.map((componentOption, index) => (
            <FormSelectOption
              isDisabled={componentOption.disabled}
              key={index}
              value={componentOption.value}
              label={componentOption.label}
            />
          ))}
        </FormSelect>
      </FormGroup>
      <FormGroup label="Context Path" isRequired fieldId="context-path">
        <TextInput
          isRequired
          type="text"
          id="context-path"
          name="context-path"
          value={contextPath}
          onChange={handleContextPathChange}
        />
      </FormGroup>
      <FormGroup label="Host" isRequired fieldId="host">
        <TextInput isRequired type="text" id="host" name="host" value={host} onChange={handleHostChange} />
      </FormGroup>
      <FormGroup label="Port" isRequired fieldId="port">
        <TextInput isRequired type="number" id="port" name="port" value={port} onChange={handlePortChange} />
      </FormGroup>
      <FormGroup label="Binding Mode" isRequired fieldId="binding-mode">
        <FormSelect
          value={bindingMode}
          onChange={handleBindingModeChange}
          aria-label="FormSelect Input"
          ouiaId="BasicFormSelect"
        >
          {bindingModeOptions.map((bindingModeOption, index) => (
            <FormSelectOption
              isDisabled={bindingModeOption.disabled}
              key={index}
              value={bindingModeOption.value}
              label={bindingModeOption.label}
            />
          ))}
        </FormSelect>
      </FormGroup>
      <ActionGroup>
        <Button variant="primary">Delete</Button>
      </ActionGroup>
    </Form>
  );
};

export const Btn: FunctionComponent = () => {
  return (
    <Form>
      <ActionGroup>
        <Button variant="primary">Create</Button>
      </ActionGroup>
    </Form>
  );
};

export const RestConfigurationForm: FunctionComponent = () => {
  const hasConfiguration = true;
  return <Form>{hasConfiguration ? <ConfigForm /> : <Btn />}</Form>;
};
