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

import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';

export class Route {
	public readonly associatedFile: string;

	constructor(
		public readonly routeId: string,
		public readonly source: string,
		public readonly from?: string,
		public readonly remote?: string,
		public readonly state?: string,
		public readonly uptime?: string,
		public readonly statistics: any = {},
	) {
		this.associatedFile = this.extractFilePathFromSource(source);
	}

	private extractFilePathFromSource(source: string): string {
		const fileRegExp = /^file:(.*):\d+$/;
		const match = fileRegExp.exec(source);
		if (!match) {
			KaotoOutputChannel.logError(`Could not extract file path from source: ${source}`);
			return source;
		}

		const rawPath = match[1];

		// handle Windows paths (e.g., c:\Users...) where it may still be escaped
		if (process.platform === 'win32') {
			// ensure backslashes are preserved
			return rawPath;
		}

		// for Unix-like systems, decode URI and return
		try {
			return decodeURIComponent(rawPath);
		} catch (e) {
			KaotoOutputChannel.logError(`Failed to decode file path: ${rawPath}`);
			return rawPath;
		}
	}
}
