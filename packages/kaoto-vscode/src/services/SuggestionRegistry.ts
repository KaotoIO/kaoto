/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { findAllApplicationPropertiesFiles, parseMultipleApplicationPropertiesFiles } from './ApplicationPropertiesFinder';
import { Uri } from 'vscode';
import { Suggestion, SuggestionRequestContext } from '@kaoto/kaoto';

export type SuggestionProviderFunction = (word: string, context: SuggestionRequestContext, fsPath?: string) => Suggestion[] | Promise<Suggestion[]>;

const suggestionRegistry = new Map<string, SuggestionProviderFunction>();

/**
 * Registers a new suggestion provider for a given topic
 */
export function registerSuggestionProvider(topic: string, providerFn: SuggestionProviderFunction): void {
	suggestionRegistry.set(topic, providerFn);
}

/**
 * Retrieves suggestions from the provider registered for the given topic
 * @param topic The topic for which suggestions are being requested (e.g., "env", "properties", "kubernetes", "beans", etc.)
 * @param word The current word or input value for which suggestions are being requested
 * @param context Additional context for the suggestions, such as the property name and current input value.
 * @param fsPath A string file system path to a current active opened Kaoto editor file
 * @returns A promise that resolves to an array of suggestions, each containing a value, optional description, and optional group.
 */
export async function getSuggestions(topic: string, word: string, context: SuggestionRequestContext, fsPath?: string): Promise<Suggestion[]> {
	const suggestionProvider = suggestionRegistry.get(topic);
	if (!suggestionProvider) {
		return [];
	}
	const result = suggestionProvider(word ?? '', context, fsPath);
	return result;
}

export function filterSuggestionsByWord(suggestions: Suggestion[], word: string): Suggestion[] {
	const lowerWord = word.toLowerCase();

	return suggestions
		.map((s) => {
			const value = s.value;
			if (value.startsWith(word)) {
				return { suggestion: s, rank: 0 };
			}
			if (value.toLowerCase().startsWith(lowerWord)) {
				return { suggestion: s, rank: 1 };
			}
			if (value.includes(word)) {
				return { suggestion: s, rank: 2 };
			}
			if (value.toLowerCase().includes(lowerWord)) {
				return { suggestion: s, rank: 3 };
			}
			return null;
		})
		.filter((x): x is { suggestion: Suggestion; rank: number } => x !== null)
		.sort((a, b) => a.rank - b.rank || a.suggestion.value.localeCompare(b.suggestion.value))
		.map(({ suggestion }) => suggestion);
}

const provideEnvSuggestions: SuggestionProviderFunction = (word, _context) => {
	const allEnvSuggestions = Object.keys(process.env).map((envVar) => ({
		value: envVar,
	}));
	return filterSuggestionsByWord(allEnvSuggestions, word);
};

const provideApplicationPropertiesSuggestions: SuggestionProviderFunction = async (word, _context, fsPath) => {
	if (!fsPath) {
		return [];
	}

	const fileUri = Uri.file(fsPath);
	const propFiles = await findAllApplicationPropertiesFiles(fileUri);

	if (propFiles.length === 0) {
		return [];
	}

	const allPropertiesSuggestions = await parseMultipleApplicationPropertiesFiles(propFiles);
	return filterSuggestionsByWord(allPropertiesSuggestions, word);
};

/**
 * Register 'env' suggestion provider
 */
registerSuggestionProvider('env', provideEnvSuggestions);

/**
 * Register 'application.properties' suggestion provider
 */
registerSuggestionProvider('properties', provideApplicationPropertiesSuggestions);
