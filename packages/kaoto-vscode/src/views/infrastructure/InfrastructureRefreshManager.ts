import { Disposable, workspace } from 'vscode';
import { KAOTO_VIEWS_REFRESH_INTERVAL_SETTING_ID } from '../../constants';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';

/**
 * Manages auto-refresh functionality for infrastructure services.
 * Handles periodic refresh intervals and configuration changes.
 */
export class InfrastructureRefreshManager implements Disposable {
	private refreshInterval: number;
	private autoRefreshHandle?: NodeJS.Timeout;
	private refreshInFlight = false;
	private readonly disposables: Disposable[] = [];

	constructor(private readonly onRefresh: () => Promise<void>) {
		this.refreshInterval = this.getRefreshInterval();
		this.registerConfigurationListener();
	}

	dispose(): void {
		this.stopAutoRefresh();
		this.disposables.forEach((disposable) => disposable.dispose());
		this.disposables.length = 0;
	}

	isAutoRefreshActive(): boolean {
		return this.autoRefreshHandle !== undefined;
	}

	startAutoRefresh(): void {
		this.stopAutoRefresh();
		this.autoRefreshHandle = setInterval(() => {
			// Auto-refresh will be skipped if manual operation is in progress
			if (this.refreshInFlight) {
				return;
			}
			this.refreshInFlight = true;
			this.onRefresh()
				.catch((error) => {
					KaotoOutputChannel.logError('[Infrastructure] Auto-refresh failed', error);
				})
				.finally(() => {
					this.refreshInFlight = false;
				});
		}, this.refreshInterval);
	}

	stopAutoRefresh(): void {
		if (this.autoRefreshHandle) {
			clearInterval(this.autoRefreshHandle);
			this.autoRefreshHandle = undefined;
		}
	}

	private restartAutoRefresh(): void {
		// Only restart if there's an active refresh handle
		if (this.autoRefreshHandle) {
			this.startAutoRefresh();
		}
	}

	private getRefreshInterval(): number {
		const configured = workspace.getConfiguration().get<number>(KAOTO_VIEWS_REFRESH_INTERVAL_SETTING_ID, 5000);
		return Number.isFinite(configured) ? Math.max(1000, configured) : 5000;
	}

	private registerConfigurationListener(): void {
		this.disposables.push(
			workspace.onDidChangeConfiguration((event) => {
				if (event.affectsConfiguration(KAOTO_VIEWS_REFRESH_INTERVAL_SETTING_ID)) {
					this.refreshInterval = this.getRefreshInterval();
					this.restartAutoRefresh();
				}
			}),
		);
	}
}
