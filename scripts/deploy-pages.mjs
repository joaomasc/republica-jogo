/**
 * Publica o site no GitHub Pages sem depender do GitHub Actions: faz o build de apps/web com o
 * caminho do repositório (/nome-do-repo/) e envia o resultado para a branch `gh-pages`.
 *
 * Uso: npm run deploy:pages   (precisa de acesso de escrita ao remoto `origin`)
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const remote = out('git remote get-url origin');
const repo = remote.replace(/\.git$/, '').split('/').pop();
const base = `/${repo}/`;
console.log(`Build do site para ${base} ...`);
run('npm run build -w @republica/web', { env: { ...process.env, VITE_BASE: base, MSYS_NO_PATHCONV: '1' } });

const dir = mkdtempSync(join(tmpdir(), 'republica-pages-'));
try {
  cpSync('apps/web/dist', dir, { recursive: true });
  // SPA: links diretos caem no index.html; sem Jekyll para servir os arquivos como estão.
  cpSync(join(dir, 'index.html'), join(dir, '404.html'));
  writeFileSync(join(dir, '.nojekyll'), '');
  const name = out('git config user.name');
  const email = out('git config user.email');
  const git = (cmd) => run(`git ${cmd}`, { cwd: dir });
  git('init -q -b gh-pages');
  git(`config user.name "${name}"`);
  git(`config user.email "${email}"`);
  git('add -A');
  git(`commit -q -m "Site publicado a partir de ${out('git rev-parse --short HEAD')}"`);
  // Envia a partir deste repositório (usa as credenciais dele). A branch gh-pages só guarda o
  // site gerado: cada publicação substitui a anterior.
  run(`git fetch -q "${dir}" gh-pages`);
  run('git push -q --force origin FETCH_HEAD:refs/heads/gh-pages');
  console.log(`Publicado: https://${remote.split('/').slice(-2, -1)[0]}.github.io/${repo}/`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
