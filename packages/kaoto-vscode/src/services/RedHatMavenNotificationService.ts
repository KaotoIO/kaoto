import * as vscode from 'vscode';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { safeGlobalStateGet, safeGlobalStateUpdate } from '../utils/Vscode';
import { isRedHatBuild } from '../utils/Version';

const DONT_SHOW_AGAIN_KEY = 'kaoto.redhat.maven.notification.dontShowAgain';

const RED_HAT_MAVEN_DOCS_URL =
	'https://docs.redhat.com/es/documentation/red_hat_build_of_apache_camel/4.18/html/getting_started_with_red_hat_build_of_apache_camel_for_spring_boot/set-up-maven-locally#add-red-hat-repositories-to-maven';

/**
 * Manages Red Hat Maven settings notifications.
 * Owned by KaotoCatalogService -- no singleton needed.
 */
export class RedHatMavenNotificationService {
	constructor(private readonly context: vscode.ExtensionContext) {}

	private isDontShowAgainEnabled(): boolean {
		return safeGlobalStateGet(this.context, DONT_SHOW_AGAIN_KEY, false);
	}

	private async setDontShowAgain(value: boolean): Promise<void> {
		await safeGlobalStateUpdate(this.context, DONT_SHOW_AGAIN_KEY, value);
		KaotoOutputChannel.logInfo(`Red Hat Maven notification preference updated: dontShowAgain=${value}`);
	}

	public isRedHatCatalog(catalogVersion: string): boolean {
		return isRedHatBuild(catalogVersion);
	}

	/**
	 * Show notification about Red Hat Maven settings requirement.
	 * Only shown for JBang executor with Red Hat catalog when user hasn't dismissed it.
	 */
	public async showRedHatMavenNotification(catalogVersion: string, executorType: string): Promise<void> {
		if (this.isDontShowAgainEnabled()) {
			KaotoOutputChannel.logInfo('Red Hat Maven notification suppressed (user selected "Don\'t show again")');
			return;
		}

		if (executorType !== 'jbang') {
			return;
		}

		if (!this.isRedHatCatalog(catalogVersion)) {
			return;
		}

		KaotoOutputChannel.logInfo(`Showing Red Hat Maven notification for catalog version: ${catalogVersion}`);

		const message =
			`You are using Red Hat Camel catalog (${catalogVersion}) with JBang CLI. ` +
			`Specific Maven settings.xml configuration is required for proper functionality.`;

		const action = await vscode.window.showInformationMessage(message, 'View Documentation', "Don't Show Again");

		if (action === 'View Documentation') {
			await vscode.env.openExternal(vscode.Uri.parse(RED_HAT_MAVEN_DOCS_URL));
			KaotoOutputChannel.logInfo('User opened Red Hat Maven documentation');
		} else if (action === "Don't Show Again") {
			await this.setDontShowAgain(true);
			vscode.window.showInformationMessage('Red Hat Maven notification disabled. You can re-enable it in extension settings.');
		}
	}
}
