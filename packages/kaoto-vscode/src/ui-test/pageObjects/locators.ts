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

/**
 * Kaoto IT-test custom locator contribution.
 *
 * Compiled to `out/pageObjects/locators.js` and registered with ExTester via
 * `extester.config.json` → `run.customPageObjects`.
 *
 * The exported `locators` object follows the `LocatorDiff` shape expected by
 * `vscode-extension-tester`:  any unknown top-level key is accepted because
 * `AbstractElement.locators` uses an open intersection type.
 *
 * Usage in page-object classes:
 *   import { AbstractElement } from 'vscode-extension-tester';
 *   // locators are available at runtime via AbstractElement.locators
 *
 * Usage in tests directly:
 *   import { kaotoLocators } from '../pageObjects/locators';
 *   By.xpath(kaotoLocators.KaotoEditor.emptyCanvas);
 */

import { By } from 'vscode-extension-tester';
import type { LocatorDiff } from 'vscode-extension-tester';

// ─── Typed locator map ────────────────────────────────────────────────────────

/**
 * All Kaoto-specific CSS/XPath selectors in one place.
 *
 * These are plain string values or `By` locators.  The `LocatorDiff` shape
 * requires the leaf values to be `By` objects; this object is also exported
 * as `kaotoLocators` (typed with plain strings) for direct use in tests that
 * prefer string-form XPath.
 */
export const kaotoLocators = {
	/** Main Kaoto webview canvas & editor state */
	KaotoEditor: {
		/**
		 * Root element the Kaoto editor envelope renders into
		 * (see `src/webview/KaotoEditorEnvelopeApp.ts`).
		 *
		 * Present in the Kaoto webview for every supported file type, and absent from
		 * both the workbench DOM and any other extension webview (such as "What's New").
		 * Used to prove that `switchToFrame()` really landed in the Kaoto editor.
		 */
		envelopeApp: `#envelope-app`,
		emptyCanvas: `//div[@data-testid='visualization-empty-state']`,
		topology: `//div[@data-test-id='topology']`,
		designTabLink: `a[data-testid="design-tab"]`,
		closeSideBar: `//button[@data-testid='close-side-bar']`,
		propertyPanelCard: `pf-v6-c-card`,
		flowsListRouteId: (name: string) => `//span[@data-testid='flows-list-route-id' and contains(., '${name}')]`,
	},

	/** Editor tab bar (Design / Beans / DataMapper) */
	EditorTabs: {
		tabsList: `pf-v6-c-tabs__list`,
		tabsItemText: `pf-v6-c-tabs__item-text`,
		activeTabXpath: `//button[@aria-selected='true']`,
		tabByLabel: (label: string) => `//button[@aria-label='${label}']`,
	},

	/** Canvas topology nodes */
	KaotoNode: {
		/**
		 * Generic node by data-testid prefix OR data-nodelabel.
		 * Covers Kaoto 2.3 (<g data-testid="custom-node__*">) and
		 * Kaoto 2.4+ (<foreignObject data-nodelabel="*">).
		 */
		byTestIdOrLabel: (testIdPrefix: string, nodeLabel: string) =>
			`//*[(name()='g' or name()='foreignObject') and (starts-with(@data-testid,'${testIdPrefix}') or @data-nodelabel='${nodeLabel}')]`,
		/**
		 * Kaoto 2.4+ nodes carry the step test-id on an inner <div>, while the
		 * clickable element is the parent <foreignObject data-nodelabel="…">.
		 * This locator finds that <foreignObject> by the exact test-id of its child div.
		 */
		byInnerTestId: (testId: string) => `//*[name()='foreignObject' and ./div[@data-testid='${testId}']]`,
		/** Node by exact data-testid (CSS) — g or foreignObject */
		byTestId: (testId: string) => `g[data-testid="${testId}"],foreignObject[data-testid="${testId}"]`,
		/** Node where data-testid starts-with prefix (CSS) — g or foreignObject */
		byTestIdPrefix: (prefix: string) => `g[data-testid^="${prefix}"],foreignObject[data-testid^="${prefix}"]`,
		/** Node by data-nodelabel (CSS) — g or foreignObject */
		byNodeLabel: (label: string) => `g[data-nodelabel="${label}"],foreignObject[data-nodelabel="${label}"]`,
		/** Node label text span (for NodeLabel settings test) */
		labelText: (testId: string) =>
			`//*[(name()='g' or name()='foreignObject') and @data-testid='${testId}']//*[contains(@class,'custom-node__label__text')]`,
		/** Compound selector: testId prefix OR data-nodelabel — CSS form */
		byTestIdPrefixOrNodeLabel: (prefix: string, label: string) =>
			`g[data-testid^="${prefix}"],g[data-nodelabel="${label}"],foreignObject[data-testid^="${prefix}"],foreignObject[data-nodelabel="${label}"]`,
		/**
		 * Timer / from node — covers Kaoto 2.3 (<g data-testid="custom-node__timer">)
		 * and Kaoto 2.4+ (<foreignObject data-nodelabel="route.from">).
		 */
		timerOrFromNode: `g[data-testid^="custom-node__timer"],g[data-testid="custom-node__route.from"],foreignObject[data-nodelabel="route.from"]`,
		/**
		 * Log node — covers Kaoto 2.3 (<g data-testid="custom-node__log">) and
		 * Kaoto 2.4+ (<foreignObject data-nodelabel="log">).
		 */
		logNode: `g[data-testid^="custom-node__log"],g[data-testid="custom-node__route.from.steps.0.log"],foreignObject[data-nodelabel="log"]`,
	},

	/** Design-tab link inside the DataMapper view */
	KaotoDesignTab: {
		link: `a[data-testid="design-tab"]`,
	},

	/** Kaoto topology context menu */
	KaotoContextMenu: {
		menu: `pf-topology-context-menu__c-dropdown__menu`,
		replaceItem: `//*[@data-testid='context-menu-item-replace']`,
		deleteItem: `li[data-testid="context-menu-item-delete"]`,
	},

	/** Step toolbar (shown when a node is selected) */
	StepToolbar: {
		toolbar: `//div[@data-testid='step-toolbar']`,
		deleteButton: (stepId: string) => `button[data-testid="${stepId}|step-toolbar-button-delete"]`,
		resetViewButton: `button[id='reset-view']`,
		actionConfirmModal: `//div[@data-ouia-component-id='ActionConfirmationModal']`,
		confirmDeleteStepAndFile: `button[data-testid="action-confirmation-modal-btn-del-step-and-file"]`,
	},

	/** Edge / add-step interactions */
	KaotoEdge: {
		addStepIcon: `custom-edge__add-step add-step-icon`,
	},

	/** Component/step catalog inside the editor */
	KaotoCatalog: {
		filterInput: `//input[@placeholder='Filter by name, description or tag']`,
		filterTextInput: `pf-v6-c-text-input-group__text-input`,
		tileByTestId: (id: string) => `div[data-testid="tile-${id}"]`,
		tileHeaderByTestId: (id: string) => `//div[@data-testid='tile-header-${id}']`,
		dslListButton: `//button[@data-testid='dsl-list-btn']`,
	},

	/** Catalog modal (opened via toolbar catalog button) */
	CatalogModal: {
		catalogButton: `//button[@id='topology-control-bar-catalog-button']`,
		window: `//div[@data-ouia-component-id='CatalogModal']`,
		closeButton: `//button[@data-ouia-component-id='CatalogModal-ModalBoxCloseButton']`,
		listButton: `//button[@id='toggle-layout-button-List']`,
		galleryButton: `//button[@id='toggle-layout-button-Gallery']`,
		list: `pf-v6-c-data-list`,
		gallery: `pf-v6-l-gallery pf-m-gutter`,
		listItemRow: `pf-v6-c-data-list__item-row`,
		listItemProvider: `catalog-data-list-item__provider`,
		providerFilterDropdown: `//button[@data-testid='provider-filter-toggle']`,
		providerSelectMenu: `providers-select-menu`,
		providerMenuListItem: `pf-v6-c-menu__list-item`,
		providerItem: (label: string) => `//li[@data-testid='providers-select-item-${label}']`,
	},

	/** Beans editor (side panel) */
	BeansEditor: {
		listView: `metadata-editor-modal-list-view`,
		detailsView: `metadata-editor-modal-details-view`,
	},

	/** DataMapper editor */
	DataMapperEditor: {
		howTo: `pf-v6-l-bullseye datamapper-howto`,
		openEditorButton: `button[title="Click to launch the Kaoto DataMapper editor"]`,
		attachSchemaButton: (target: string) => `button[data-testid="attach-schema-${target}-button"]`,
		attachSchemaModal: `//div[@data-testid='attach-schema-modal']`,
		attachSchemaFileButton: `//button[@data-testid='attach-schema-modal-btn-file']`,
		attachSchemaAttachButton: `//button[@data-testid='attach-schema-modal-btn-attach']`,
		sourceFieldByTestId: `//div[starts-with(@data-testid, "node-source-field-shiporder-")] | //div[starts-with(@data-testid, "node-source-fx-shiporder-")]`,
	},
} as const;

// ─── LocatorDiff contribution ─────────────────────────────────────────────────

/**
 * ExTester custom page-objects locator contribution.
 *
 * All selectors that require a `By` object at runtime are registered here.
 * This file is compiled to `out/pageObjects/locators.js` and loaded by
 * ExTester's `customPageObjects.locatorsPath` option before tests run.
 *
 * Page object classes extend `AbstractElement` and call
 * `MyClass.locators.Kaoto*.*` to access these selectors.
 */
export const locators: LocatorDiff['locators'] = {
	/**
	 * Override of the built-in ExTester webview locator.
	 *
	 * ExTester ships (`@redhat-developer/locators`, 1.90.0 profile):
	 *   //div[not(@data-parent-flow-to-element-id)]/iframe[@class='webview ready']
	 *
	 * Since VS Code 1.132.0 the webview container always carries
	 * `data-parent-flow-to-element-id`, empty when there is no parent flow target:
	 *   <div class="webview-overlay-content" data-parent-flow-to-element-id="">
	 *
	 * XPath `not(@attr)` tests attribute *existence*, not its value, so the shipped
	 * locator matches zero elements. `WebView.switchToFrame()` then silently returns
	 * without switching, and every webview query afterwards runs against the workbench
	 * DOM -- surfacing as a `NoSuchElementError` for a perfectly valid app selector.
	 *
	 * Measured on VS Code 1.132.0, the container of an editor webview is:
	 *   <div class="webview-overlay-content"
	 *        data-parent-flow-to-element-id="webview-editor-element-73e4fa48-...">
	 *
	 * The attribute is present and holds the editor element id, so `not(@attr)` -- which
	 * tests attribute *existence* -- excludes every editor webview and the shipped locator
	 * matches nothing. `WebView.switchToFrame()` then hits its `if (!view) return;` branch
	 * and silently does not switch, leaving the driver in the workbench DOM; the failure
	 * only surfaces later as a `NoSuchElementError` naming a perfectly valid Kaoto selector.
	 *
	 * Matching the iframe directly sidesteps the attribute entirely and works on both DOM
	 * shapes. Upstream added that predicate to exclude the Welcome/walkthrough webview
	 * (redhat-developer/vscode-extension-tester#1492); dropping it is safe here because
	 * `it-tests/vscode-settings.json` sets `workbench.startupEditor: none`, so no
	 * walkthrough is ever open, and ExTester still resolves between multiple matches by
	 * rect overlap with the editor under test.
	 *
	 * Upstream issue: https://github.com/redhat-developer/vscode-extension-tester/issues/2450
	 */
	WebView: {
		iframe: By.css(`iframe.webview.ready`),
	},

	KaotoEditor: {
		constructor: By.xpath(`//div[@data-testid='visualization-empty-state']`),
		envelopeApp: By.css(`#envelope-app`),
		emptyCanvas: By.xpath(`//div[@data-testid='visualization-empty-state']`),
		topology: By.xpath(`//div[@data-test-id='topology']`),
		designTabLink: By.css(`a[data-testid="design-tab"]`),
		closeSideBar: By.xpath(`//button[@data-testid='close-side-bar']`),
		propertyPanelCard: By.className(`pf-v6-c-card`),
	},

	EditorTabs: {
		constructor: By.className(`pf-v6-c-tabs__list`),
		tabsList: By.className(`pf-v6-c-tabs__list`),
		activeTab: By.xpath(`//button[@aria-selected='true']`),
		tabText: By.className(`pf-v6-c-tabs__item-text`),
	},

	KaotoContextMenu: {
		constructor: By.className(`pf-topology-context-menu__c-dropdown__menu`),
		menu: By.className(`pf-topology-context-menu__c-dropdown__menu`),
		replaceItem: By.xpath(`//*[@data-testid='context-menu-item-replace']`),
		deleteItem: By.css(`li[data-testid="context-menu-item-delete"]`),
	},

	StepToolbar: {
		constructor: By.xpath(`//div[@data-testid='step-toolbar']`),
		toolbar: By.xpath(`//div[@data-testid='step-toolbar']`),
		resetViewButton: By.css(`button[id='reset-view']`),
		actionConfirmModal: By.xpath(`//div[@data-ouia-component-id='ActionConfirmationModal']`),
	},

	KaotoCatalog: {
		constructor: By.xpath(`//input[@placeholder='Filter by name, description or tag']`),
		filterInput: By.xpath(`//input[@placeholder='Filter by name, description or tag']`),
		filterTextInput: By.className(`pf-v6-c-text-input-group__text-input`),
		dslListButton: By.xpath(`//button[@data-testid='dsl-list-btn']`),
	},

	CatalogModal: {
		constructor: By.xpath(`//button[@id='topology-control-bar-catalog-button']`),
		catalogButton: By.xpath(`//button[@id='topology-control-bar-catalog-button']`),
		window: By.xpath(`//div[@data-ouia-component-id='CatalogModal']`),
		closeButton: By.xpath(`//button[@data-ouia-component-id='CatalogModal-ModalBoxCloseButton']`),
		listButton: By.xpath(`//button[@id='toggle-layout-button-List']`),
		galleryButton: By.xpath(`//button[@id='toggle-layout-button-Gallery']`),
		list: By.className(`pf-v6-c-data-list`),
		gallery: By.className(`pf-v6-l-gallery pf-m-gutter`),
		listItemRow: By.className(`pf-v6-c-data-list__item-row`),
		listItemProvider: By.className(`catalog-data-list-item__provider`),
		providerFilterDropdown: By.xpath(`//button[@data-testid='provider-filter-toggle']`),
		providerSelectMenu: By.id(`providers-select-menu`),
		providerMenuListItem: By.className(`pf-v6-c-menu__list-item`),
	},

	BeansEditor: {
		constructor: By.className(`metadata-editor-modal-list-view`),
		listView: By.className(`metadata-editor-modal-list-view`),
		detailsView: By.className(`metadata-editor-modal-details-view`),
	},

	DataMapperEditor: {
		constructor: By.className(`pf-v6-l-bullseye datamapper-howto`),
		howTo: By.className(`pf-v6-l-bullseye datamapper-howto`),
		openEditorButton: By.css(`button[title="Click to launch the Kaoto DataMapper editor"]`),
		attachSchemaModal: By.xpath(`//div[@data-testid='attach-schema-modal']`),
		attachSchemaFileButton: By.xpath(`//button[@data-testid='attach-schema-modal-btn-file']`),
		attachSchemaAttachButton: By.xpath(`//button[@data-testid='attach-schema-modal-btn-attach']`),
		sourceField: By.xpath(
			`//div[starts-with(@data-testid, "node-source-field-shiporder-")] | //div[starts-with(@data-testid, "node-source-fx-shiporder-")]`,
		),
	},
};
