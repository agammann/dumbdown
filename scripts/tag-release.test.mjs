import { test } from "node:test";
import assert from "node:assert/strict";
import tagRelease from "./tag-release.mjs";

const sha = "a".repeat(40);
const missing = () => Object.assign(new Error("missing"), { status: 404 });
function fixture() {
  const created = [];
  let main = sha, tag = null, release = false, runs = [{ id: 1, path: ".github/workflows/ci.yml", head_sha: sha, head_branch: "main", event: "push", status: "completed", conclusion: "success" }];
  let jobs = [{ name: "verify", status: "completed", conclusion: "success" }];
  const github = { paginate: async () => release ? [{ tag_name: "v1.0.3", draft: true }] : [], rest: {
    repos: {
      getBranch: async () => ({ data: { commit: { sha: main } } }),
      listReleases: async () => { throw new Error("must use pagination"); },
    },
    actions: {
      listWorkflowRuns: async () => ({ data: { workflow_runs: runs } }),
      listJobsForWorkflowRun: async () => ({ data: { jobs } }),
    },
    git: {
      getRef: async () => { if (!tag) throw missing(); return { data: { object: tag } }; },
      createRef: async (input) => { created.push(input); tag = { type: "commit", sha: input.sha }; },
    },
  } };
  const args = { github, context: { eventName: "workflow_dispatch", ref: "refs/heads/main", sha, repo: { owner: "a", repo: "b" } }, core: { info() {} }, expectedVersion: "1.0.3", expectedSha: sha, metadata: { name: "dumbdown", license: "MIT", version: "1.0.3" } };
  return { args, created, setMain: (v) => { main = v; }, setTag: (v) => { tag = v; }, setRelease: (v) => { release = v; }, setRuns: (v) => { runs = v; }, setJobs: (v) => { jobs = v; } };
}
test("creates only the requested exact version tag after successful main verification", async () => {
  const f = fixture(); await tagRelease(f.args);
  assert.deepEqual(f.created, [{ owner: "a", repo: "b", ref: "refs/tags/v1.0.3", sha }]);
});
test("rejects wrong branch, SHA, metadata and version", async () => {
  for (const edit of [
    (a) => { a.context.ref = "refs/heads/other"; },
    (a) => { a.context.eventName = "push"; },
    (a) => { a.expectedSha = "b".repeat(40); },
    (a) => { a.expectedVersion = "1.0.4"; },
    (a) => { a.metadata.name = "other"; },
    (a) => { a.expectedVersion = "1.0.3-rc"; },
  ]) { const f = fixture(); edit(f.args); await assert.rejects(tagRelease(f.args)); assert.equal(f.created.length, 0); }
});
test("rejects main drift, missing or unsuccessful verification", async () => {
  for (const edit of [
    (f) => f.setMain("b".repeat(40)),
    (f) => f.setRuns([]),
    (f) => f.setRuns([{ id: 1, path: ".github/workflows/ci.yml", head_sha: sha, head_branch: "main", event: "pull_request", status: "completed", conclusion: "success" }]),
    (f) => f.setJobs([{ name: "verify", status: "completed", conclusion: "failure" }]),
  ]) { const f = fixture(); edit(f); await assert.rejects(tagRelease(f.args)); assert.equal(f.created.length, 0); }
});
test("never overwrites an existing tag or release", async () => {
  for (const edit of [(f) => f.setTag({type: "commit", sha}), (f) => f.setRelease(true)]) {
    const f = fixture(); edit(f); await assert.rejects(tagRelease(f.args)); assert.equal(f.created.length, 0);
  }
});
test("rejects a main change immediately before creation", async () => {
  const f = fixture(); let calls = 0;
  f.args.github.rest.repos.getBranch = async () => ({data: {commit: {sha: ++calls === 1 ? sha : "b".repeat(40)}}});
  await assert.rejects(tagRelease(f.args)); assert.equal(f.created.length, 0);
});

test("reports main drift after creation without deleting or moving the tag", async () => {
  const f = fixture(); let calls = 0;
  f.args.github.rest.repos.getBranch = async () => ({data: {commit: {sha: ++calls <= 2 ? sha : "b".repeat(40)}}});
  await assert.rejects(tagRelease(f.args)); assert.equal(f.created.length, 1);
});
