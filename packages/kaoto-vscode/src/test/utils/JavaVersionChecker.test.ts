/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JavaVersionCheck, JavaVersionChecker } from '../../utils/JavaVersionChecker';

suite('JavaVersionChecker', () => {
	suite('checkJavaVersion', () => {
		let dir: string;

		const executable = (name: string, script: string, mode = 0o755): string => {
			const file = path.join(dir, name);
			fs.writeFileSync(file, `#!/bin/sh\n${script}\n`, { mode });
			return file;
		};

		setup(function () {
			if (process.platform === 'win32') {
				this.skip(); // the fake Java executables are shell scripts
			}
			dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-java-'));
		});

		teardown(() => {
			if (dir) {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		test('tells the version that java -version writes', async () => {
			const java = executable('java', `echo 'openjdk version "21.0.4" 2024-07-16 LTS' >&2`);

			expect(await JavaVersionChecker.checkJavaVersion(java)).to.deep.equal({ status: 'version', version: 21 });
		});

		test('tells a missing executable', async () => {
			expect(await JavaVersionChecker.checkJavaVersion(path.join(dir, 'missing', 'java'))).to.deep.equal({ status: 'missing' });
		});

		test('tells a missing Java for the macOS stub when no JDK is installed', async () => {
			const java = executable(
				'java',
				`echo 'The operation couldn’t be completed. Unable to locate a Java Runtime.' >&2; echo 'Please visit http://www.java.com for information on installing Java.' >&2; exit 1`,
			);

			expect(await JavaVersionChecker.checkJavaVersion(java)).to.deep.equal({ status: 'missing' });
		});

		test('tells a failure for an executable that cannot run', async () => {
			const java = executable('java', `echo 'openjdk version "21"' >&2`, 0o644);

			const check = await JavaVersionChecker.checkJavaVersion(java);

			expect(check.status).to.equal('failed');
			expect((check as { error: NodeJS.ErrnoException }).error.code).to.equal('EACCES');
		});

		test('tells a failure for an executable that exits with an error', async () => {
			const java = executable('java', `echo 'Error: could not create the Java Virtual Machine.' >&2; exit 1`);

			const check = await JavaVersionChecker.checkJavaVersion(java);

			expect(check.status).to.equal('failed');
		});

		test('tells a failure for an executable that does not finish in time', async () => {
			const java = executable('java', 'sleep 5');

			const check = await JavaVersionChecker.checkJavaVersion(java, 100);

			expect(check.status).to.equal('failed');
			expect((check as { error: Error }).error.message).to.contain('did not finish within 0.1 seconds');
		});

		test('tells a failure for an executable without output', async () => {
			const java = executable('java', 'exit 0');

			const check = await JavaVersionChecker.checkJavaVersion(java);

			expect(check.status).to.equal('failed');
			expect((check as { error: Error }).error.message).to.contain('(no output)');
		});

		test('tells a failure for an output without a version', async () => {
			const java = executable('java', `echo 'hello'`);

			const check = await JavaVersionChecker.checkJavaVersion(java);

			expect(check.status).to.equal('failed');
			expect((check as { error: Error }).error.message).to.contain('hello');
		});
	});

	suite('parseJavaVersion', () => {
		test('reads the major version', () => {
			expect(JavaVersionChecker.parseJavaVersion('openjdk version "17.0.2" 2022-01-18')).to.equal(17);
			expect(JavaVersionChecker.parseJavaVersion('openjdk version "21" 2023-09-19')).to.equal(21);
		});

		test('reads the legacy 1.x format', () => {
			expect(JavaVersionChecker.parseJavaVersion('java version "1.8.0_402"')).to.equal(8);
		});

		test('reads the version after other lines', () => {
			expect(JavaVersionChecker.parseJavaVersion('Picked up JAVA_TOOL_OPTIONS: -Xmx1g\nopenjdk version "11.0.22"')).to.equal(11);
		});

		test('tells no version for an output without one', () => {
			expect(JavaVersionChecker.parseJavaVersion('')).to.be.undefined;
			expect(JavaVersionChecker.parseJavaVersion('command not found')).to.be.undefined;
		});
	});

	suite('findJava', () => {
		const originalJavaHome = process.env['JAVA_HOME'];
		const originalCheckJavaVersion = JavaVersionChecker.checkJavaVersion;
		let javaHome: string;
		let javaHomeExecutable: string;
		let checks: Record<string, JavaVersionCheck>;
		let checked: string[];

		setup(() => {
			javaHome = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-java-home-'));
			javaHomeExecutable = JavaVersionChecker.getJavaHomeExecutable(javaHome);
			fs.mkdirSync(path.dirname(javaHomeExecutable), { recursive: true });
			fs.writeFileSync(javaHomeExecutable, '');
			process.env['JAVA_HOME'] = javaHome;
			checks = {};
			checked = [];
			JavaVersionChecker.checkJavaVersion = (javaPath: string) => {
				checked.push(javaPath);
				return Promise.resolve(checks[javaPath] ?? { status: 'missing' });
			};
		});

		teardown(() => {
			JavaVersionChecker.checkJavaVersion = originalCheckJavaVersion;
			if (originalJavaHome === undefined) {
				delete process.env['JAVA_HOME'];
			} else {
				process.env['JAVA_HOME'] = originalJavaHome;
			}
			fs.rmSync(javaHome, { recursive: true, force: true });
		});

		test('runs the Java of JAVA_HOME when it is recent enough', async () => {
			checks[javaHomeExecutable] = { status: 'version', version: 21 };
			checks['java'] = { status: 'version', version: 25 };

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'found', executable: javaHomeExecutable, version: 21 });
			expect(checked).to.deep.equal([javaHomeExecutable]);
		});

		test('runs the Java on the PATH when the Java of JAVA_HOME is too old', async () => {
			checks[javaHomeExecutable] = { status: 'version', version: 11 };
			checks['java'] = { status: 'version', version: 21 };

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'found', executable: 'java', version: 21 });
		});

		test('runs the Java on the PATH when the Java of JAVA_HOME cannot run', async () => {
			checks[javaHomeExecutable] = { status: 'failed', error: new Error('EACCES') };
			checks['java'] = { status: 'version', version: 17 };

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'found', executable: 'java', version: 17 });
		});

		test('runs the Java on the PATH when JAVA_HOME has no java executable', async () => {
			fs.rmSync(javaHomeExecutable);
			checks['java'] = { status: 'version', version: 21 };

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'found', executable: 'java', version: 21 });
			expect(checked).to.deep.equal(['java']);
		});

		test('tells the too old Java of JAVA_HOME when there is no Java on the PATH', async () => {
			checks[javaHomeExecutable] = { status: 'version', version: 11 };

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'tooOld', executable: javaHomeExecutable, version: 11 });
		});

		test('tells the too old Java of JAVA_HOME when the Java on the PATH is too old as well', async () => {
			checks[javaHomeExecutable] = { status: 'version', version: 11 };
			checks['java'] = { status: 'version', version: 8 };

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'tooOld', executable: javaHomeExecutable, version: 11 });
		});

		test('tells a Java on the PATH that cannot run, instead of no Java', async () => {
			delete process.env['JAVA_HOME'];
			const error = new Error('spawn java EACCES');
			checks['java'] = { status: 'failed', error };

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'notRunnable', executable: 'java', error });
		});

		test('tells no Java when there is none', async () => {
			delete process.env['JAVA_HOME'];

			expect(await JavaVersionChecker.findJava(17)).to.deep.equal({ status: 'notFound' });
		});

		test('looks for java.exe on Windows', () => {
			expect(JavaVersionChecker.getJavaHomeExecutable('jdk', 'win32')).to.equal(path.join('jdk', 'bin', 'java.exe'));
			expect(JavaVersionChecker.getJavaHomeExecutable('jdk', 'linux')).to.equal(path.join('jdk', 'bin', 'java'));
			expect(JavaVersionChecker.getJavaHomeExecutable('jdk', 'darwin')).to.equal(path.join('jdk', 'bin', 'java'));
		});
	});
});
