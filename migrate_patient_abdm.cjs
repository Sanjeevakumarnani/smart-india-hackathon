const mysql = require('mysql2/promise');
require('dotenv').config();

const columns = [
  ['abha_address', 'VARCHAR(255) NULL UNIQUE AFTER abha_id'],
  ['photo_url', 'VARCHAR(500) NULL AFTER dob'],
];

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'medikiosk',
  });

  for (const [name, definition] of columns) {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = \'patients\' AND column_name = ?',
      [name]
    );
    if (Number(rows[0].count) === 0) {
      await db.query(`ALTER TABLE patients ADD COLUMN ${name} ${definition}`);
      console.log(`Added patients.${name}`);
    } else {
      console.log(`patients.${name} already exists`);
    }
  }

  await db.end();
  console.log('Patient ABDM schema migration complete.');
}

run().catch((error) => {
  console.error('Patient ABDM migration failed:', error.message);
  process.exit(1);
});
