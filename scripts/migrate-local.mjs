import {DatabaseSync} from "node:sqlite";
import {readFileSync,readdirSync,mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const dbPath=process.env.RUMMY_DB_PATH||resolve(root,"data/rummy-club.db");
mkdirSync(dirname(dbPath),{recursive:true});

const database=new DatabaseSync(dbPath);
try { database.exec("ALTER TABLE rummi_migrations RENAME TO rummy_migrations"); } catch {}
database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
const execute=(sql)=>database.prepare(sql).all();

database.exec("CREATE TABLE IF NOT EXISTS rummy_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)");

const applied=new Set(execute("SELECT name FROM rummy_migrations").map(r=>r.name));
const catalog=new Set(execute("SELECT name FROM sqlite_master WHERE type IN ('table','index')").map(r=>r.name));
const columns=new Set(catalog.has("rooms")?execute("PRAGMA table_info(rooms)").map(r=>r.name):[]);
const migrationDir=resolve(root,"drizzle");
const files=readdirSync(migrationDir)
  .filter(name=>/^\d{4}_[\w-]+\.sql$/.test(name))
  .sort();

for(const name of files){
  if(applied.has(name))continue;
  const sql=readFileSync(resolve(migrationDir,name),"utf8").replaceAll("--> statement-breakpoint","\n");
  let adopted=false;

  if(name==="0000_cheerful_tenebrous.sql"&&["code","state","version","created"].every(c=>columns.has(c))) adopted=true;
  if(name==="0001_chemical_golden_guardian.sql"&&columns.has("is_public")){
    database.exec("CREATE INDEX IF NOT EXISTS idx_rooms_public_created ON rooms (is_public,created)");
    adopted=true;
  }
  if(name==="0002_pale_randall_flagg.sql"&&columns.has("activity_at")) adopted=true;

  if(!adopted) database.exec(sql);
  database.prepare("INSERT INTO rummy_migrations (name,applied_at) VALUES (?,?)").run(name,Date.now());
  console.log(`${adopted?"Adopted":"Applied"} ${name}`);
}

database.close();
