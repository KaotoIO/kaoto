/**
 * Copyright 2025 Red Hat, Inc. and/or its affiliates.
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
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { ProgressLocation, ShellExecution, Task, TaskDefinition, TaskPanelKind, TaskRevealKind, tasks, TaskScope, window, WorkspaceFolder } from 'vscode';

export interface CamelTaskDefinition extends TaskDefinition {
	label: string;
	type: 'camel';
	port: number;
}

/**
 * This class represents implementation of vscode.task for Camel commands.
 * Uses the generic executor abstraction (JBang or Camel Launcher).
 */
export class CamelTask extends Task {
	// Constant for indicating no port is specified
	public static readonly NO_PORT = -1;

	protected label: string;

	constructor(
		scope: WorkspaceFolder | TaskScope.Workspace,
		label: string,
		shellExecution: ShellExecution,
		closePanel: boolean = false,
		revealTask: TaskRevealKind = TaskRevealKind.Always,
		port: number = CamelTask.NO_PORT,
	) {
		const taskDefinition: CamelTaskDefinition = {
			label,
			type: 'camel',
			port: port,
		};

		super(taskDefinition, scope, label, 'kaoto', shellExecution);
		this.label = label;
		this.presentationOptions = {
			clear: true, // clear terminal before task execution
			echo: false, // do not echo task command into terminal
			showReuseMessage: false, // do not show "Terminal will be reused by tasks, press any key to close it" message at the end of each task
			panel: TaskPanelKind.New,
			close: closePanel, // (optional) the terminal is closed after executing the task, default is false = not to close
			reveal: revealTask, // task output is reveal in the user interface, default is RevealKind.Always
		};
	}

	/**
	 * Execute and wait till the end of the task
	 */
	public async executeAndWait(): Promise<void> {
		const completion = this.waitForCompletion();
		await this.execute();
		await completion;
	}

	public async executeAndWaitWithProgress(message: string): Promise<void> {
		const completion = this.waitForCompletion();
		await this.execute();
		await window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: message,
				cancellable: false,
			},
			(progress) => {
				progress.report({ increment: 50 });
				return completion.then(() => progress.report({ increment: 100 }));
			},
		);
	}

	/**
	 * Execute without waiting for end of the task
	 */
	public async execute(): Promise<void> {
		if (this.execution) {
			const exec = this.execution as ShellExecution;
			const cmd = typeof exec.command === 'string' ? exec.command : (exec.command?.value ?? '');
			const argsStr = exec.args?.map((a) => (typeof a === 'string' ? a : a.value)).join(' ');
			KaotoOutputChannel.logInfo(`${this.label}: "${cmd} ${argsStr}"`);
		}
		await tasks.executeTask(this);
	}

	private waitForCompletion(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const disposable = tasks.onDidEndTaskProcess((e) => {
				if (e.execution.task.name === this.label) {
					disposable.dispose();
					if (e.exitCode === 0) {
						resolve();
					} else {
						reject(new Error(`Task "${this.label}" failed with exit code ${e.exitCode}`));
					}
				}
			});
		});
	}
}
