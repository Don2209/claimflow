// Builds the site for GitHub Pages and publishes dist/ as a new commit on the gh-pages branch.
import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repository = 'https://github.com/Don2209/claimflow.git';
const branch = 'gh-pages';
const env = {
  ...process.env,
  VITE_SITE_BASE: '/claimflow',
  VITE_SITE_URL: 'https://don2209.github.io/claimflow',
};
const dist = resolve('dist');
const run = (command, cwd) => execSync(command, { env, cwd, stdio: 'inherit' });

run('npm run build');

const work = mkdtempSync(join(tmpdir(), 'claimflow-pages-'));
try {
  try {
    run(`git clone -q --depth 1 --branch ${branch} ${repository} .`, work);
  } catch {
    // First deploy: the branch does not exist yet.
    run(`git init -q -b ${branch}`, work);
    run(`git remote add origin ${repository}`, work);
  }

  for (const name of readdirSync(work)) {
    if (name !== '.git') rmSync(join(work, name), { recursive: true });
  }
  cpSync(dist, work, { recursive: true });
  writeFileSync(join(work, '.nojekyll'), '');

  run('git add -A', work);
  run(
    'git commit -q -m "Deploy site" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"',
    work,
  );
  run(`git push origin ${branch}`, work);
} finally {
  rmSync(work, { recursive: true });
}
