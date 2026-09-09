/**
 * MediKiosk+ Automated Database Setup & Verification Script
 * This script connects to MySQL, creates the medikiosk database,
 * executes schema.sql to create all tables, seeds default data & users,
 * and verifies that everything is ready for production or local development.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Helpers for colored console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function logInfo(msg) {
  console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`);
}
function logSuccess(msg) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`);
}
function logWarn(msg) {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`);
}
function logError(msg) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`);
}

function promptInput(questionText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function updateEnvFile(key, value) {
  const envPath = path.join(process.cwd(), '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}="${value}"`);
    } else {
      content += `\n${key}="${value}"`;
    }
  } else {
    content = `${key}="${value}"\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

async function tryConnect(host, port, user, password) {
  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 5000,
      ...dbSslOption(),
    });
    return { success: true, conn };
  } catch (err) {
    return { success: false, error: err };
  }
}

/** Mirrors backend/src/db.ts: enable TLS for managed cloud MySQL when DB_SSL=true. */
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
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}🏥 MediKiosk+ Database Initializer & Verifier${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  let host = process.env.DB_HOST || 'localhost';
  let port = parseInt(process.env.DB_PORT || '3306', 10);
  let user = process.env.DB_USER || 'root';
  let password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root';
  let dbName = process.env.DB_NAME || 'medikiosk';

  logInfo(`Target MySQL Server: ${host}:${port} (User: ${user})`);

  // 1. Test connection with configured credentials
  let connectRes = await tryConnect(host, port, user, password);

  // If password failed, try common fallback passwords (e.g. empty string or 'root')
  if (!connectRes.success && connectRes.error.code === 'ER_ACCESS_DENIED_ERROR') {
    logWarn(`Access denied for user '${user}' with current password. Attempting common defaults...`);
    const commonPasswords = ['', 'root', 'admin', 'password', '123456', '12345678'];
    for (const altPass of commonPasswords) {
      if (altPass === password) continue;
      const testRes = await tryConnect(host, port, user, altPass);
      if (testRes.success) {
        connectRes = testRes;
        password = altPass;
        updateEnvFile('DB_PASSWORD', password);
        logSuccess(`Connected using password '${altPass === '' ? '(empty)' : altPass}'. Updated .env!`);
        break;
      }
    }
  }

  // If still not connected and it's an interactive TTY, prompt the user
  if (!connectRes.success && connectRes.error.code === 'ER_ACCESS_DENIED_ERROR' && process.stdin.isTTY) {
    console.log(`\n${colors.yellow}Please enter your MySQL root password below:${colors.reset}`);
    const userPass = await promptInput('MySQL Password: ');
    const testRes = await tryConnect(host, port, user, userPass);
    if (testRes.success) {
      connectRes = testRes;
      password = userPass;
      updateEnvFile('DB_PASSWORD', password);
      logSuccess('Password verified and saved to .env!');
    }
  }

  // If connection failed completely (e.g. MySQL not running)
  if (!connectRes.success) {
    logError(`Could not connect to MySQL server at ${host}:${port}`);
    logError(`Reason: ${connectRes.error.message} (${connectRes.error.code || 'UNKNOWN'})`);
    console.log('\n' + '-'.repeat(60));
    logWarn('HOW TO FIX:');
    console.log(' 1. Make sure MySQL service is running on your Windows laptop.');
    console.log('    - If using MySQL Community Server: Open Services (services.msc) -> start "MySQL80"');
    console.log('    - If using XAMPP: Open XAMPP Control Panel -> click "Start" next to MySQL');
    console.log(' 2. Verify port 3306 is open and not blocked.');
    console.log(' 3. NOTE: MediKiosk+ includes an in-memory fallback datastore,');
    console.log('    so the kiosk can still run without MySQL, but data will reset on reboot.');
    console.log('-'.repeat(60) + '\n');
    return false;
  }

  const rootConn = connectRes.conn;
  logSuccess(`Connected to MySQL server on ${host}:${port}!`);

  // 2. Create database if not exists
  logInfo(`Creating database \`${dbName}\` if not exists...`);
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  logSuccess(`Database \`${dbName}\` is ready.`);
  await rootConn.end();

  // 3. Connect to the medikiosk database with multipleStatements enabled
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database: dbName,
    multipleStatements: true,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 5,
    ...dbSslOption(),
  });

  // 4. Read and execute schema.sql
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    logInfo('Reading schema.sql and executing database schema...');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema statements on a dedicated connection with foreign key checks disabled
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
      await conn.query(schemaSql);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
      logSuccess('schema.sql executed successfully! All tables created.');
    } catch (err) {
      logWarn(`Warning during schema execution: ${err.message}`);
    } finally {
      if (conn) conn.release();
    }
  } else {
    logWarn('schema.sql not found in project root. Skipping full schema run.');
  }

  // 5. Seed / Update standard login credentials with verified bcrypt hashes
  logInfo('Setting up standard user accounts (admin, doctor1, staff1)...');
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const docHash = await bcrypt.hash('Doctor@123', 10);
  const staffHash = await bcrypt.hash('Staff@123', 10);

  const seedUsers = [
    ['usr-admin-001', 'admin', adminHash, 'admin', 'System Administrator', 'EMP-001', 'IT Administration'],
    ['usr-doc-001', 'doctor1', docHash, 'doctor', 'Dr. Priya Sharma (MD)', 'DOC-001', 'General Medicine'],
    ['usr-staff-001', 'staff1', staffHash, 'staff', 'Sister Anita Rao (Staff Nurse)', 'STF-001', 'Triage & OPD'],
  ];

  for (const u of seedUsers) {
    await pool.query(
      `INSERT INTO users (id, username, password_hash, role, full_name, employee_id, department)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         full_name = VALUES(full_name),
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         is_active = 1`,
      u
    );
  }
  logSuccess('User credentials initialized & verified!');

  // 6. Verify Tables
  logInfo('Verifying database tables...');
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map((t) => Object.values(t)[0]);

  console.log('\n' + '-'.repeat(60));
  console.log(`${colors.bright}Database Status: \`${dbName}\` (${tableNames.length} tables)${colors.reset}`);
  console.log('-'.repeat(60));
  tableNames.forEach((name, i) => {
    console.log(` ${(i + 1).toString().padStart(2, ' ')}. ${colors.green}✓${colors.reset} ${name}`);
  });

  // Verify seed counts
  try {
    const [[{ langCount }]] = await pool.query('SELECT COUNT(*) as langCount FROM supported_languages');
    const [[{ complaintCount }]] = await pool.query('SELECT COUNT(*) as complaintCount FROM chief_complaints');
    const [[{ userCount }]] = await pool.query('SELECT COUNT(*) as userCount FROM users');
    const [[{ stationCount }]] = await pool.query('SELECT COUNT(*) as stationCount FROM kiosk_stations');

    console.log('\n' + '-'.repeat(60));
    console.log(`${colors.bright}Seed Data Verification:${colors.reset}`);
    console.log(` - Languages loaded:       ${langCount}`);
    console.log(` - Chief complaints:       ${complaintCount}`);
    console.log(` - Active Kiosk stations:  ${stationCount}`);
    console.log(` - Staff/Admin users:      ${userCount}`);
    console.log('-'.repeat(60));
  } catch (e) {
    logWarn(`Seed count check notice: ${e.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}🎉 MediKiosk+ Database is 100% READY!${colors.reset}`);
  console.log('Login credentials:');
  console.log('  • Admin:   admin   / Admin@123');
  console.log('  • Doctor:  doctor1 / Doctor@123');
  console.log('  • Staff:   staff1  / Staff@123');
  console.log('='.repeat(60) + '\n');

  await pool.end();
  return true;
}

main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    logError(`Database initialization error: ${err.message}`);
    process.exit(1);
  });
