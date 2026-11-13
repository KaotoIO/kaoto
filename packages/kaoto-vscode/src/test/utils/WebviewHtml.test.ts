import { assert } from 'chai';
import { escapeAttribute, fillDevWebviewHtml, fillWebviewHtml } from '../../utils/WebviewHtml';

/** The parts of `webview.html` that the extension fills */
const page = [
	'<meta http-equiv="Content-Security-Policy" content="__KAOTO_CSP__" />',
	'<link rel="stylesheet" href="/src/webview/webview-shell.scss" />',
	'<div id="kaoto-editor" data-file-extension="__KAOTO_FILE_EXTENSION__" data-resources-path-prefix="__KAOTO_RESOURCES_PATH_PREFIX__"></div>',
	'<script nonce="__KAOTO_NONCE__" src="__KAOTO_HOST_SHIM__"></script>',
	'<script type="module" nonce="__KAOTO_NONCE__" src="/src/webview/start.tsx"></script>',
].join('\n');
/** The same page as the Vite dev server serves it, with the scripts it injects */
const vitePage = [
	'<script type="module">import { injectIntoGlobalHook } from "/@react-refresh";</script>',
	'<script type="module" src="/@vite/client"></script>',
	page,
].join('\n');
const values = { csp: "default-src 'none'", fileExtension: 'camel.yaml', hostShim: 'https://file+.vscode-resource/shim.js?a=1&b=2' };

suite('WebviewHtml', () => {
	suite('fillWebviewHtml', () => {
		const bundle = {
			...values,
			nonce: 'abc123',
			resourcesPathPrefix: 'https://file+.vscode-resource/dist/webview/editors/kaoto',
			stylesheet: 'https://file+.vscode-resource/dist/webview/KaotoEditor.css',
			script: 'https://file+.vscode-resource/dist/webview/KaotoEditor.js',
		};

		test('loads the bundle in place of the dev stylesheet and script', () => {
			const html = fillWebviewHtml(page, bundle);

			assert.include(html, `<link rel="stylesheet" href="${bundle.stylesheet}" />`);
			assert.include(html, `<script type="module" nonce="abc123" src="${bundle.script}"></script>`);
			assert.include(html, `<script nonce="abc123" src="https://file+.vscode-resource/shim.js?a=1&amp;b=2"></script>`);
			assert.include(html, `data-resources-path-prefix="${bundle.resourcesPathPrefix}"`);
			assert.notInclude(html, '/src/webview/');
			assert.notInclude(html, '__KAOTO_');
		});

		test('refuses a page without the dev script or one of the placeholders', () => {
			assert.throws(() => fillWebviewHtml(page.replace('/src/webview/start.tsx', '/main.js'), bundle), /missing "\/src\/webview\/start.tsx"/);
			assert.throws(() => fillWebviewHtml(page.replace('__KAOTO_CSP__', ''), bundle), /missing __KAOTO_CSP__/);
		});
	});

	suite('fillDevWebviewHtml', () => {
		const origin = 'http://127.0.0.1:5273';

		test('loads the editor, its loader styles and the Vite scripts from the dev server', () => {
			const html = fillDevWebviewHtml(vitePage, origin, values);

			assert.include(html, `<link rel="stylesheet" href="${origin}/src/webview/webview-shell.scss" />`);
			assert.include(html, `src="${origin}/src/webview/start.tsx"></script>`);
			assert.include(html, `<script type="module" src="${origin}/@vite/client"></script>`);
			assert.include(html, `from "${origin}/@react-refresh"`);
			assert.include(html, `data-resources-path-prefix="${origin}"`);
			// The dev page allows inline scripts instead of a nonce
			assert.notInclude(html.replaceAll('__KAOTO_NONCE__', ''), '__KAOTO_');
		});

		test('fills the page values as escaped attributes', () => {
			const html = fillDevWebviewHtml(vitePage, origin, values);

			assert.include(html, `content="default-src 'none'"`);
			assert.include(html, 'data-file-extension="camel.yaml"');
			assert.include(html, 'src="https://file+.vscode-resource/shim.js?a=1&amp;b=2"></script>');
		});

		test('refuses a page without one of the Vite scripts', () => {
			assert.throws(() => fillDevWebviewHtml(page, origin, values), /missing "\/@vite\/client"/);
		});
	});

	suite('escapeAttribute', () => {
		test('escapes the characters that end or break a double-quoted attribute', () => {
			assert.strictEqual(escapeAttribute('a "b" <c> & d'), 'a &quot;b&quot; &lt;c&gt; &amp; d');
		});
	});
});
