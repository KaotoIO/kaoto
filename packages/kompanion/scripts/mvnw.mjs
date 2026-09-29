#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const wrapper = isWindows ? 'mvnw.cmd' : './mvnw';
// On Windows, .cmd files must be launched through the command processor (ComSpec / cmd.exe).
// Node.js cannot execute .cmd files directly with execFileSync.
if (isWindows) {
  const comSpec = process.env.ComSpec || 'cmd.exe';
  execFileSync(comSpec, ['/c', wrapper, ...process.argv.slice(2)], { stdio: 'inherit' });
} else {
  execFileSync(wrapper, process.argv.slice(2), { stdio: 'inherit' });
}
