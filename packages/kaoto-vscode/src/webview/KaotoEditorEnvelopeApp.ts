/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 */

import { startKaotoWebview } from '@kaoto/kaoto/webview';

declare const acquireVsCodeApi: () => { postMessage(message: unknown): void };

const api = acquireVsCodeApi();
startKaotoWebview({
  send: (message) => {
    api.postMessage(message);
  },
  onMessage: (handler) => {
    const listener = (event: MessageEvent) => handler(event.data);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  },
  dispose: () => {},
});
