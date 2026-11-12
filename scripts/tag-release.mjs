export default async function tagRelease({ github, context, core, expectedVersion, expectedSha, metadata }) {
  if (context.eventName !== "workflow_dispatch" || context.ref !== "refs/heads/main" ||
      !/^[0-9a-f]{40}$/.test(expectedSha) || context.sha !== expectedSha) {
    throw new Error("Run manually on the explicitly selected exact main commit.");
  }
  if (metadata.name !== "dumbdown" || metadata.license !== "MIT" ||
      !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(expectedVersion) ||
      metadata.version !== expectedVersion) {
    throw new Error("Expected stable version must match package metadata.");
  }
  const { owner, repo } = context.repo;
  const tag = "v" + expectedVersion;
  const requireMain = async () => {
    const { data } = await github.rest.repos.getBranch({ owner, repo, branch: "main" });
    if (data.commit.sha !== expectedSha) throw new Error("Main changed since the requested commit.");
  };
  await requireMain();
  const runs = (await github.rest.actions.listWorkflowRuns({
    owner, repo, workflow_id: "ci.yml", branch: "main", event: "push",
    head_sha: expectedSha, status: "success", per_page: 100,
  })).data.workflow_runs;
  let verified = false;
  for (const run of runs) {
    if (run.path !== ".github/workflows/ci.yml" || run.head_sha !== expectedSha ||
        run.head_branch !== "main" || run.event !== "push" ||
        run.status !== "completed" || run.conclusion !== "success") continue;
    const jobs = (await github.rest.actions.listJobsForWorkflowRun({
      owner, repo, run_id: run.id, per_page: 100,
    })).data.jobs;
    if (jobs.some((job) => job.name === "verify" && job.status === "completed" && job.conclusion === "success")) {
      verified = true;
      break;
    }
  }
  if (!verified) throw new Error("No successful main push verification for this exact commit.");
  const releases = await github.paginate(github.rest.repos.listReleases, { owner, repo, per_page: 100 });
  if (releases.some((release) => release.tag_name === tag)) {
    throw new Error("A release already exists for this version.");
  }
  try {
    await github.rest.git.getRef({ owner, repo, ref: "tags/" + tag });
    throw new Error("The tag already exists; refusing to change it.");
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  // GitHub does not provide an atomic compare-main-and-create-tag operation.
  // A later advance leaves publication blocked by release.mjs's own main checks.
  await requireMain();
  await github.rest.git.createRef({ owner, repo, ref: "refs/tags/" + tag, sha: expectedSha });
  const created = (await github.rest.git.getRef({ owner, repo, ref: "tags/" + tag })).data.object;
  if (created.type !== "commit" || created.sha !== expectedSha) {
    throw new Error("Created tag did not resolve to the requested commit.");
  }
  await requireMain();
  core.info("Created " + tag + " at " + expectedSha + ". Run Verify manually on main to publish.");
}
