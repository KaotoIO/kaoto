import { ColorScheme } from '@kaoto/kaoto/models';
import { assert } from 'chai';
import * as vscode from 'vscode';
import { resolveColorScheme } from '../../utils/Vscode';

const themeKind = vscode.ColorThemeKind;

/** The built-in VS Code theme of each kind */
const THEMES = {
	[themeKind.Light]: 'Default Light Modern',
	[themeKind.Dark]: 'Default Dark Modern',
	[themeKind.HighContrast]: 'Default High Contrast',
	[themeKind.HighContrastLight]: 'Default High Contrast Light',
};

async function useTheme(kind: keyof typeof THEMES): Promise<void> {
	await vscode.workspace.getConfiguration('workbench').update('colorTheme', THEMES[kind], vscode.ConfigurationTarget.Global);
	// The active theme changes after the setting, so wait for it
	const deadline = Date.now() + 5_000;
	while (vscode.window.activeColorTheme.kind !== kind && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	assert.strictEqual(vscode.window.activeColorTheme.kind, kind);
}

suite('resolveColorScheme', function () {
	this.timeout(20_000);
	const kaoto = vscode.workspace.getConfiguration('kaoto');
	const workbench = vscode.workspace.getConfiguration('workbench');
	let previousScheme: string | undefined;
	let previousTheme: string | undefined;

	suiteSetup(() => {
		previousScheme = kaoto.inspect<string>('colorTheme')?.globalValue;
		previousTheme = workbench.inspect<string>('colorTheme')?.globalValue;
	});

	suiteTeardown(async () => {
		await workbench.update('colorTheme', previousTheme, vscode.ConfigurationTarget.Global);
		await kaoto.update('colorTheme', previousScheme, vscode.ConfigurationTarget.Global);
	});

	const cases: { setting: ColorScheme; theme: keyof typeof THEMES; expected: ColorScheme }[] = [
		{ setting: ColorScheme.Auto, theme: themeKind.Light, expected: ColorScheme.Light },
		{ setting: ColorScheme.Auto, theme: themeKind.Dark, expected: ColorScheme.Dark },
		{ setting: ColorScheme.Auto, theme: themeKind.HighContrast, expected: ColorScheme.Dark },
		{ setting: ColorScheme.Auto, theme: themeKind.HighContrastLight, expected: ColorScheme.Light },
		{ setting: ColorScheme.Light, theme: themeKind.Dark, expected: ColorScheme.Light },
		{ setting: ColorScheme.Dark, theme: themeKind.Light, expected: ColorScheme.Dark },
	];

	for (const { setting, theme, expected } of cases) {
		test(`resolves '${setting}' to '${expected}' with the ${THEMES[theme]} VS Code theme`, async () => {
			await useTheme(theme);
			await kaoto.update('colorTheme', setting, vscode.ConfigurationTarget.Global);

			assert.strictEqual(resolveColorScheme(), expected);
		});
	}
});
