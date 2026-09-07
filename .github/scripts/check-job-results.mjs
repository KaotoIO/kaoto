/**
 * Validate the aggregate `build` job result.
 *
 * Reads the JSON-serialised `needs` context from the RESULTS environment variable
 * and exits non-zero if any job failed or was cancelled, or if the `changes` job
 * did not succeed.  Intentionally skipped jobs are accepted.
 */
const jobs = JSON.parse(process.env.RESULTS);
const allowed = new Set(['success', 'skipped']);

if (jobs.changes.result !== 'success' || Object.values(jobs).some((job) => !allowed.has(job.result))) {
  process.exit(1);
}
