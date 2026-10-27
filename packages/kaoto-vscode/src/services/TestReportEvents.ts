import * as vscode from 'vscode';

export class TestReportEvents {
	private static _instance: TestReportEvents;
	private readonly _onTestReportReady = new vscode.EventEmitter<string[]>();
	readonly onTestReportReady = this._onTestReportReady.event;

	private readonly _onTestRunStarted = new vscode.EventEmitter<string[]>();
	readonly onTestRunStarted = this._onTestRunStarted.event;

	static get instance(): TestReportEvents {
		if (!this._instance) {
			this._instance = new TestReportEvents();
		}
		return this._instance;
	}

	fireTestReportReady(filePaths: string[]): void {
		this._onTestReportReady.fire(filePaths);
	}

	fireTestRunStarted(filePaths: string[]): void {
		this._onTestRunStarted.fire(filePaths);
	}
}
