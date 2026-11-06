// Builds the site for GitHub Pages and publishes dist/ to the gh-pages branch.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repository = 'https://github.com/Don2209/claimflow.git';
const env = {
  ...process.env,
  VITE_SITE_BASE: '/claimflow',
  VITE_SITE_URL: 'https://don2209.github.io/claimflow',
};
const run = (command, cwd) => execSync(command, { env, cwd, stdio: 'inherit' });

run('npm run build');
writeFileSync(join('dist', '.nojekyll'), '');

const message = 'Deploy site\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';
run('git init -q -b gh-pages', 'dist');
run('git add -A', 'dist');
run(`git commit -q -m "${message}"`, 'dist');
// The branch only ever holds generated files, so each deploy replaces it.
run(`git push -f ${repository} gh-pages`, 'dist');
execSync('rm -rf .git', { cwd: 'dist' });
