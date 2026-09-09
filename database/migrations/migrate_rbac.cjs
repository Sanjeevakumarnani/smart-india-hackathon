const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

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

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'medikiosk',
    multipleStatements: true,
    charset: 'utf8mb4',
    ...dbSslOption()
  });

  console.log('Connecting to MySQL...');

  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','doctor','staff') NOT NULL DEFAULT 'staff',
      full_name VARCHAR(255) NOT NULL,
      employee_id VARCHAR(50) UNIQUE,
      department VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS user_sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token_hash VARCHAR(512) NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      expires_at DATETIME NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS queue_reprioritizations (
      id VARCHAR(36) PRIMARY KEY,
      token_id VARCHAR(36) NOT NULL,
      old_position INT NOT NULL,
      new_position INT NOT NULL,
      reason VARCHAR(500),
      performed_by VARCHAR(36),
      performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS system_health_logs (
      id VARCHAR(36) PRIMARY KEY,
      service_name VARCHAR(100) NOT NULL,
      status ENUM('healthy','degraded','down') NOT NULL DEFAULT 'healthy',
      response_ms INT,
      detail TEXT,
      checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS content_questions (
      id VARCHAR(36) PRIMARY KEY,
      complaint_key VARCHAR(100) NOT NULL,
      question_key VARCHAR(100) NOT NULL,
      stage ENUM('SOCRATES','AYUSH','HISTORY','INTAKE') NOT NULL DEFAULT 'SOCRATES',
      question_en TEXT NOT NULL,
      question_hi TEXT,
      question_ta TEXT,
      question_te TEXT,
      question_bn TEXT,
      question_mr TEXT,
      question_gu TEXT,
      question_kn TEXT,
      question_pa TEXT,
      question_ml TEXT,
      question_or TEXT,
      question_as TEXT,
      answer_type ENUM('text','options','scale','boolean','multi') NOT NULL DEFAULT 'text',
      options_json JSON,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_complaint_key (complaint_key, question_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS consent_texts (
      id VARCHAR(36) PRIMARY KEY,
      lang_code VARCHAR(10) NOT NULL,
      section_key VARCHAR(100) NOT NULL,
      content_text TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lang_section (lang_code, section_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS staff_actions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      action_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100),
      entity_id VARCHAR(36),
      description TEXT,
      ip_address VARCHAR(45),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const statement of sqlStatements) {
    await pool.query(statement);
  }
  console.log('RBAC & Management tables verified/created successfully.');

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const docHash = await bcrypt.hash('Doctor@123', 10);
  const staffHash = await bcrypt.hash('Staff@123', 10);

  const seedUsers = [
    ['usr-admin-001', 'admin', adminHash, 'admin', 'System Administrator', 'EMP-001', 'IT Administration'],
    ['usr-doc-001', 'doctor1', docHash, 'doctor', 'Dr. Priya Sharma (MD)', 'DOC-001', 'General Medicine'],
    ['usr-staff-001', 'staff1', staffHash, 'staff', 'Sister Anita Rao (Staff Nurse)', 'STF-001', 'Triage & OPD']
  ];

  for (const u of seedUsers) {
    await pool.query(`
      INSERT INTO users (id, username, password_hash, role, full_name, employee_id, department)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role)
    `, u);
  }
  console.log('Default credentials initialized: admin/Admin@123, doctor1/Doctor@123, staff1/Staff@123');

  const [tables] = await pool.query('SHOW TABLES');
  console.log('Total tables in medikiosk:', tables.length);
  tables.forEach(t => console.log(' - ' + Object.values(t)[0]));

  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

