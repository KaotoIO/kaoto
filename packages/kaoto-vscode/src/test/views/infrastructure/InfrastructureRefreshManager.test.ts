/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
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
import { assert } from 'chai';
import { InfrastructureRefreshManager } from '../../../views/infrastructure/InfrastructureRefreshManager';

// ─── startAutoRefresh / stopAutoRefresh ───────────────────────────────────────

suite('InfrastructureRefreshManager — startAutoRefresh / stopAutoRefresh', function () {
	test('onRefresh is called after the interval fires', function (done) {
		let callCount = 0;
		const manager = new InfrastructureRefreshManager(async () => {
			callCount++;
			assert.isAbove(callCount, 0, 'onRefresh callback was invoked after the interval fired');
			manager.stopAutoRefresh();
			manager.dispose();
			done();
		});
		// Use a short 10ms interval to keep the test fast
		(manager as any).refreshInterval = 10;
		manager.startAutoRefresh();
	});

	test('stopAutoRefresh prevents further calls', function (done) {
		let callCount = 0;
		const manager = new InfrastructureRefreshManager(async () => {
			callCount++;
		});
		(manager as any).refreshInterval = 10;
		manager.startAutoRefresh();
		manager.stopAutoRefresh();

		// Wait long enough that a second tick would have fired if still running
		setTimeout(() => {
			assert.strictEqual(callCount, 0, 'callback must not be called after stopAutoRefresh');
			manager.dispose();
			done();
		}, 50);
	});

	test('startAutoRefresh replaces any existing timer', function (done) {
		let callCount = 0;
		const manager = new InfrastructureRefreshManager(async () => {
			callCount++;
		});
		(manager as any).refreshInterval = 20;

		manager.startAutoRefresh();
		// Immediately start again — should cancel the first timer
		manager.startAutoRefresh();

		setTimeout(() => {
			// Only one timer should have ever fired
			assert.isAtMost(callCount, 1, 'at most one tick should fire when timers are stacked');
			manager.stopAutoRefresh();
			manager.dispose();
			done();
		}, 30);
	});

	test('dispose clears the auto-refresh handle', function () {
		const manager = new InfrastructureRefreshManager(async () => {});
		(manager as any).refreshInterval = 100;
		manager.startAutoRefresh();
		manager.dispose();
		// After dispose the internal handle should be cleared
		assert.isUndefined((manager as any).autoRefreshHandle);
	});

	test('stopAutoRefresh is idempotent when no timer is active', function () {
		const manager = new InfrastructureRefreshManager(async () => {});
		// No timer started; calling stop should not throw
		assert.doesNotThrow(() => manager.stopAutoRefresh());
		manager.dispose();
	});
});
