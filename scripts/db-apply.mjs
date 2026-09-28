// Apply a migration or run SQL against the linked Supabase project via the management API.
//   node --env-file=.env scripts/db-apply.mjs supabase/migrations/<version>_<name>.sql
//   node --env-file=.env scripts/db-apply.mjs --file tests/sql/x.sql   (run only, not recorded)
//   node --env-file=.env scripts/db-apply.mjs --sql "select 1"
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) { console.error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN must be set (.env)'); process.exit(1); }

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

const [flag, arg] = process.argv.slice(2);
try {
  if (flag === '--sql') console.log(JSON.stringify(await query(arg), null, 2));
  else if (flag === '--file') console.log(JSON.stringify(await query(readFileSync(arg, 'utf8')), null, 2));
  else if (flag) {
    const version = basename(flag).split('_')[0];
    const done = await query(`select 1 from supabase_migrations.schema_migrations where version = '${version}'`);
    if (done.length) { console.log(`already applied: ${version}`); process.exit(0); }
    await query(`begin;\n${readFileSync(flag, 'utf8')}\n;\ninsert into supabase_migrations.schema_migrations(version) values ('${version}');\ncommit;`);
    console.log(`applied: ${version}`);
  } else { console.error('usage: db-apply.mjs <migration.sql> | --file <x.sql> | --sql "<query>"'); process.exit(1); }
} catch (e) { console.error(e.message); process.exit(1); }
