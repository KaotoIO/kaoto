import * as vscode from 'vscode';

export class TestReportEvents {
	private static _instance: TestReportEvents;
	private readonly _onTestReportReady = new vscode.EventEmitter<string[]>();
	readonly onTestReportReady = this._onTestReportReady.event;

	static get instance(): TestReportEvents {
		if (!this._instance) {
			this._instance = new TestReportEvents();
		}
		return this._instance;
	}

	fireTestReportReady(filePaths: string[]): void {
		this._onTestReportReady.fire(filePaths);
	}
}
