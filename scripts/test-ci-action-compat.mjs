import assert from 'node:assert/strict';
import fs from 'node:fs';
import publish from './release.mjs';
import tagRelease from './tag-release.mjs';

// The clients below are entirely in-memory: these checks never call GitHub.
export async function verifyActionCompatibility() {
  const metadata = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const sha = 'a'.repeat(40);
  const context = {eventName: 'workflow_dispatch', ref: 'refs/heads/main',
    sha, repo: {owner: 'fixture', repo: 'fixture'}};
  const log = [];
  const releaseClient = {
    rest: {repos: {listReleases: () => { throw new Error('Unexpected direct API call'); }}},
    paginate: async () => [{tag_name: 'v' + metadata.version, draft: false}],
  };
  await publish({github: releaseClient, context, core: {info: value => log.push(value)}});
  assert.ok(log.some(value => value.includes('already published; leaving it unchanged')));
  await assert.rejects(publish({github: {}, context: {...context, eventName: 'push'}, core: {}}));

  let created = null;
  const tagClient = {
    paginate: async () => [],
    rest: {
      repos: {getBranch: async () => ({data: {commit: {sha}}}), listReleases: () => {}},
      actions: {
        listWorkflowRuns: async () => ({data: {workflow_runs: [{id: 1, path: '.github/workflows/ci.yml',
          head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success'}]}}),
        listJobsForWorkflowRun: async () => ({data: {jobs: [{name: 'verify', status: 'completed', conclusion: 'success'}]}}),
      },
      git: {
        getRef: async () => {
          if (!created) throw Object.assign(new Error('missing fixture'), {status: 404});
          return {data: {object: {type: 'commit', sha: created.sha}}};
        },
        createRef: async value => { created = value; },
      },
    },
  };
  const args = {github: tagClient, context, core: {info() {}}, metadata,
    expectedVersion: metadata.version, expectedSha: sha};
  await tagRelease(args);
  assert.deepEqual(created, {owner: 'fixture', repo: 'fixture', ref: 'refs/tags/v' + metadata.version, sha});
  created = null;
  await assert.rejects(tagRelease({...args, context: {...context, eventName: 'push'}}));
  assert.equal(created, null);
}
