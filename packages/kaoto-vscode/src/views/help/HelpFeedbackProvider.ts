/**
 * Copyright 2024 Red Hat, Inc. and/or its affiliates.
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
import { join } from 'path'; // NOSONAR
import { ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

export class HelpFeedbackProvider implements TreeDataProvider<HelpFeedbackItem> {
	private readonly items: HelpFeedbackItem[];

	private static readonly HELP_ITEMS = [
		{ label: 'Apache Camel', icon: 'camel-logo.svg', url: 'https://camel.apache.org/camel-core/getting-started/index.html' },
		{ label: 'Camel Testing Plugin', icon: 'camel-logo.svg', url: 'https://camel.apache.org/manual/camel-jbang-test.html' },
		{ label: 'Kaoto Documentation', icon: new ThemeIcon('book'), url: 'https://kaoto.io/docs/' },
		{ label: 'Enterprise Integration Explorer', icon: 'integration.svg', url: 'https://camel.solutionpatterns.io/#/patterns' },
		{ label: 'Kaoto Examples', icon: new ThemeIcon('github'), url: 'https://github.com/KaotoIO/kaoto-examples' },
		{ label: 'Citrus Examples', icon: 'citrus-logo.png', url: 'https://github.com/citrusframework/citrus-samples' },
		{ label: 'Feedback', icon: new ThemeIcon('comment'), url: 'https://github.com/KaotoIO/kaoto/issues/new/choose' },
		{ label: 'Hawtio', icon: new ThemeIcon('flame'), url: 'https://hawt.io/docs/get-started.html' },
		{
			label: 'Red Hat Demos',
			icon: 'redhat-logo.svg',
			url: 'https://www.redhat.com/architect/portfolio/detail/75-kaoto-apache-camel-integration-designer-demo',
		},
		{ label: 'Tutorials', icon: new ThemeIcon('library'), url: 'https://kaoto.io/workshop/' },
		{ label: 'YouTube Channel', icon: 'youtube-logo.svg', url: 'https://www.youtube.com/@KaotoIO' },
	];

	constructor(readonly extensionUriPath: string) {
		// since these items are static, it can be stored in a private property instead of re-creating them each time getChildren() is called.
		this.items = this.getHelpFeedbackItems();
	}

	getTreeItem(item: HelpFeedbackItem): HelpFeedbackItem {
		return item;
	}

	getChildren(item?: HelpFeedbackItem): Thenable<HelpFeedbackItem[]> {
		if (item) {
			return Promise.resolve([]);
		}
		return Promise.resolve(this.items);
	}

	private getHelpFeedbackItems(): HelpFeedbackItem[] {
		return HelpFeedbackProvider.HELP_ITEMS.map(
			(item) => new HelpFeedbackItem(item.label, typeof item.icon === 'string' ? this.getIconPath(item.icon) : item.icon, item.url),
		);
	}

	private getIconPath(name: string): string {
		return join(this.extensionUriPath, 'icons', 'help', name);
	}
}

export class HelpFeedbackItem extends TreeItem {
	constructor(
		public readonly name: string,
		public readonly icon: string | ThemeIcon,
		public readonly url: string,
	) {
		super(name, TreeItemCollapsibleState.None);

		this.iconPath = this.icon;
		this.contextValue = 'help';
		this.command = {
			command: 'vscode.open',
			title: `Open ${this.name}`,
			arguments: [Uri.parse(this.url)],
		};
		this.tooltip = `Open ${this.name} in your browser`;
	}
}
