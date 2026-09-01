import { TaskRevealKind, TaskScope, WorkspaceFolder } from 'vscode';
import { CamelTask } from './CamelTask';
import { CommandResult } from '../executors/types/ExecutorTypes';

export enum TaskPanelBehavior {
	KeepOpen = 'keep-open',
	CloseOnFinish = 'close-on-finish',
}

export enum TaskLifecycle {
	Foreground = 'foreground',
	Background = 'background',
}

export interface CamelTaskOptions {
	label: string;
	scope?: WorkspaceFolder | TaskScope.Workspace;
	panel?: TaskPanelBehavior;
	reveal?: TaskRevealKind;
	lifecycle?: TaskLifecycle;
}

/**
 * Factory for creating CamelTask instances without requiring individual subclasses.
 */
export class CamelTaskFactory {
	/**
	 * Creates a silent one-shot task (panel closes, reveal silent).
	 * Used for init, bind, export, stop, route operations, dependency updates, etc.
	 */
	static createSilent(label: string, result: CommandResult, scope?: WorkspaceFolder | TaskScope.Workspace): CamelTask {
		return CamelTaskFactory.create({ label, scope, panel: TaskPanelBehavior.CloseOnFinish, reveal: TaskRevealKind.Silent }, result);
	}

	/**
	 * Creates a background long-running task (panel stays open, always revealed).
	 * Used for run, test run, source dir run tasks.
	 */
	static createBackground(label: string, result: CommandResult): CamelTask {
		return CamelTaskFactory.create({ label, lifecycle: TaskLifecycle.Background }, result);
	}

	/**
	 * Creates a background long-running task that does NOT pop open the terminal panel.
	 * The terminal is still accessible via the Tasks panel; it is only revealed automatically
	 * when the user explicitly opens it or when a follow-up error notification is shown.
	 * Used for infrastructure service tasks where silent startup is preferred.
	 */
	static createBackgroundSilent(label: string, result: CommandResult): CamelTask {
		return CamelTaskFactory.create({ label, lifecycle: TaskLifecycle.Background, reveal: TaskRevealKind.Silent }, result);
	}

	/**
	 * Creates a task with full control over presentation options.
	 */
	static create(options: CamelTaskOptions, result: CommandResult): CamelTask {
		const task = new CamelTask(
			options.scope ?? TaskScope.Workspace,
			options.label,
			result.execution,
			options.panel === TaskPanelBehavior.CloseOnFinish,
			options.reveal ?? TaskRevealKind.Always,
			result.resolvedPort ?? CamelTask.NO_PORT,
		);
		if (options.lifecycle === TaskLifecycle.Background) {
			task.isBackground = true;
		}
		return task;
	}
}
