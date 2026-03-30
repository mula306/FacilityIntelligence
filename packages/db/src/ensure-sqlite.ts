import { mkdirSync, openSync, closeSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.startsWith("file:")) {
  process.exit(0);
}

const relativePath = databaseUrl.slice("file:".length);
const schemaDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prisma");
const databasePath = isAbsolute(relativePath) ? relativePath : resolve(schemaDirectory, relativePath);

mkdirSync(dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));
