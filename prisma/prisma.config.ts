import path from "node:path";
import { defineConfig } from "prisma/config";

// Construct DATABASE_URL from individual env vars, URL-encoding the password
function getDatabaseUrl(): string {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = process.env.DB_USER || "krya";
  const password = encodeURIComponent(process.env.DB_PASSWORD || "");
  const database = process.env.DB_NAME || "krya";
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: getDatabaseUrl(),
  },
});
