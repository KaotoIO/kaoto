/* eslint-disable */
/**
 * Test is the schema for the Citrus test API.
 */
export interface Test {
    name: string;
    author?: string;
    status?: string;
    description?: string;
    endpoints?: Record<string, any>[];
    variables?: {
      name: string;
      value?: string;
      script?: {
        type?: string;
        content?: string;
        file?: string;
        charset?: string;
      }
    }[];
    actions: TestActions[];
    finally?: TestActions[];
}

export interface TestActions {
    agent?: TestAction;
    applyTemplate?: TestAction;
    createEndpoint?: CreateEndpointAction;
    createVariables?: CreateVariablesAction;
    delay?: DelayAction;
    doFinally?: TestAction;
    echo?: EchoAction;
    fail?: TestAction;
    groovy?: GroovyAction;
    load?: EchoAction;
    print?: EchoAction;
    receive?: ReceiveAction;
    send?: SendAction;
    sleep?: DelayAction;
    start?: TestAction;
    stop?: TestAction;
    stopTime?: TestAction;
    stopTimer?: TestAction;
    timer?: TestAction;
    trace?: TestAction;
    transform?: TestAction;
    async?: AsyncContainer;
    assert?: TestActionContainer;
    catch?: TestActionContainer;
    iterate?: IterateContainer;
    parallel?: ParallelContainer;
    repeat?: RepeatContainer;
    repeatOnError?: RepeatOnErrorContainer;
    sequential?: SequentialContainer;
    conditional?: ConditionalContainer;
    waitFor?: ConditionalContainer;
    camel?: CamelAction;
    jbang?: TestAction;
    knative?: TestAction;
    kubernetes?: TestAction;
    http?: HttpAction;
    openapi?: TestAction;
    selenium?: TestAction;
    soap?: SoapAction;
    sql?: TestAction;
    purge?: TestAction;
    purgeQueues?: TestAction;
    testcontainers?: TestAction;
}

export interface TestAction {
    name?: string;
    description?: string;
}

export interface TestActionContainer extends TestAction {
    actions: TestActions[];
}

export interface CreateEndpointAction extends TestAction {
    name?: string;
    type?: string;
    properties?: {}
}

export interface CreateVariablesAction extends TestAction {
    variables: {
      name: string;
      value?: string;
      script?: {
        type?: string;
        content?: string;
        file?: string;
        charset?: string;
      }
    }[]
}

export interface EchoAction extends TestAction {
    message: string;
}

export interface GroovyAction extends TestAction {
    script?: {
      value?: string;
      file?: string;
      template?: string;
      useScriptTemplate?: boolean;
    }
    beans?: {
      file?: string;
      script?: string;
    };
    endpoints?: {
      file?: string;
      script?: string;
    }
}

export interface DelayAction extends TestAction {
    milliseconds: number;
}

export interface IterateContainer extends TestActionContainer {
    condition: string;
    index?: string;
    startsWith?: number;
    step?: number;
}

export interface RepeatContainer extends TestActionContainer {
    until: string;
    index?: string;
    startsWith?: number;
    step?: number;
}

export interface RepeatOnErrorContainer extends TestActionContainer {
    until: string;
    index?: string;
    startsWith?: number;
    step?: number;
}

export interface SequentialContainer extends TestActionContainer {
}

export interface ParallelContainer extends TestActionContainer {
}

export interface ConditionalContainer extends TestActionContainer {
    condition: string;
}

export interface AsyncContainer extends TestActionContainer {
}

export interface SendAction extends TestAction {
    endpoint: string;
    message: {
      body?: {
        data: string;
      },
      headers?: {
        name: string;
        value: string;
      }[]
    }
}

export interface ReceiveAction extends TestAction {
    endpoint: string;
    message?: {
      body?: {
        data: string;
      },
      headers?: {
        name: string;
        value: string;
      }[]
    }
}

export interface SoapAction extends TestAction {
    assertFault?: {
      faultCode: string;
      faultString: string;
      when?: TestActions;
    };
}

export interface CamelAction extends TestAction {
    jbang?: {
      cmd?: {
        receive?: TestAction;
      }
    };
}

export interface HttpAction extends TestAction {
    client?: string;
    sendRequest?: {
      client?: string;
      message?: {
        body?: {
          data: string;
        },
        headers?: {
          name: string;
          value: string;
        }[]
      }
    }
}
