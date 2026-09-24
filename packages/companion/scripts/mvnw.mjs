#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const wrapper = process.platform === 'win32' ? 'mvnw.cmd' : './mvnw';
execFileSync(wrapper, process.argv.slice(2), { stdio: 'inherit' });
