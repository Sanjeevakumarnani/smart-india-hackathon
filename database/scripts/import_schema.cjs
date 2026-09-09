/**
 * MediKiosk+ non-interactive schema importer for managed / cloud MySQL.
 *
 * Unlike migrations/setup_db.cjs (a friendly local-development wizard that
 * prompts for passwords and edits `.env`), this script is meant for managed
 * databases where the server, database name and credentials are already
 * provisioned — e.g. Aiven, DigitalOcean Managed MySQL, Railway, Render
 * (Blueprint) etc. It simply creates the database (if missing) and executes
 * schema.sql.
 *
 * Usage:
 *   node scripts/import_schema.cjs
 *
 * Config comes from environment variables (DB_HOST, DB_PORT, DB_USER,
 * DB_PASSWORD, DB_NAME, DB_SSL, DB_SSL_CA, DB_SSL_REJECT_UNAUTHORIZED).
 * See `backend/.env.example` for the full list.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

function dbSslOption() {
  if (process.env.DB_SSL !== 'true') return {};
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  const caValue = process.env.DB_SSL_CA;
  if (caValue) {
    // DB_SSL_CA may be an inline PEM string or a file path.
    const ca = caValue.startsWith('-----BEGIN') ? caValue : fs.readFileSync(caValue);
    return { ssl: { ca, rejectUnauthorized } };
  }
  return { ssl: { rejectUnauthorized } };
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root';
  const dbName = process.env.DB_NAME || 'medikiosk';
  const schemaPath = path.join(__dirname, '..', 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.sql not found at ${schemaPath}`);
  }

  console.log(`[import_schema] target ${host}:${port} (user: ${user}), database: \`${dbName}\``);

  const serverConn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    connectTimeout: 10000,
    ...dbSslOption(),
  });

  try {
    await serverConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`[import_schema] database \`${dbName}\` ready`);
  } finally {
    await serverConn.end();
  }

  const schemaConn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    multipleStatements: true,
    charset: 'utf8mb4',
    ...dbSslOption(),
  });

  try {
    console.log(`[import_schema] executing ${schemaPath} ...`);
    await schemaConn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await schemaConn.query(fs.readFileSync(schemaPath, 'utf8'));
    await schemaConn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('[import_schema] schema executed successfully');
  } finally {
    await schemaConn.end();
  }

  const verifyConn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    ...dbSslOption(),
  });

  try {
    const [tables] = await verifyConn.query('SHOW TABLES');
    const tableNames = tables.map((t) => Object.values(t)[0]);
    console.log(`[import_schema] \`${dbName}\` now has ${tableNames.length} tables:`);
    tableNames.forEach((name, i) => console.log(`  ${String(i + 1).padStart(2, ' ')}. ${name}`));

    const [[{ langCount }]] = await verifyConn.query('SELECT COUNT(*) AS langCount FROM supported_languages');
    const [[{ complaintCount }]] = await verifyConn.query('SELECT COUNT(*) AS complaintCount FROM chief_complaints');
    console.log(`[import_schema] seed check: ${langCount} languages, ${complaintCount} chief complaints`);
  } finally {
    await verifyConn.end();
  }

  console.log('[import_schema] done');
}

main().catch((err) => {
  console.error('[import_schema] FAILED:', err.message);
  process.exit(1);
});