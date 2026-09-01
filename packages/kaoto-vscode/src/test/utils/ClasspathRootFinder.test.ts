/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { assert } from 'chai';
import { findClasspathRoot } from '../../utils/ClasspathRootFinder';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Classpath root finder', () => {
	test('Find src/main/resources', async () => {
		const camelRoute = vscode.Uri.file('/tmp/fake/src/main/resources/camel/Camelroute.camel.yaml');
		const classpathRoot = findClasspathRoot(camelRoute);
		assert.equal(classpathRoot, `${path.sep}tmp${path.sep}fake${path.sep}src${path.sep}main${path.sep}resources`);
	});

	test('Find parent folder of Camel route when no src/main/resources on the path', async () => {
		const camelRoute = vscode.Uri.file('/tmp/fake/camel/Camelroute.camel.yaml');
		const classpathRoot = findClasspathRoot(camelRoute);
		assert.equal(classpathRoot, `${path.sep}tmp${path.sep}fake${path.sep}camel`);
	});
});
