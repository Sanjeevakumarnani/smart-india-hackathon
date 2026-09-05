# 🚀 MediKiosk+ Windows Laptop Transfer & Quick Setup Guide

This guide explains how to copy and run **MediKiosk+** on any other Windows laptop with a single click.

---

## 📦 Step 1: Copying Files to the Other Laptop

You can copy this folder (`medikiosk+`) using a USB drive, external hard disk, local network share, or zip file.

### 💡 Pro-Tip for Fast Transfer:
- **Do NOT need to copy `node_modules`** (deleting or skipping `node_modules` makes the folder only ~5-15 MB instead of 300+ MB). The setup script will automatically download and install clean packages on the new laptop.
- Everything else should be copied as-is:
  - `src/`
  - `public/`
  - `server.ts`
  - `schema.sql`
  - `setup_db.cjs`
  - `setup_and_launch.bat`
  - `start_medikiosk.bat`
  - `verify_system.bat`
  - `package.json`
  - `package-lock.json`
  - `tsconfig.json`
  - `vite.config.ts`
  - `index.html`
  - `.env` (or `.env.example`)

---

## 🛠️ Step 2: Prerequisites on the New Laptop

Before running the launcher, make sure the new laptop has:

1. **Node.js (v18 or v20 LTS or higher)**
   - Download installer: [https://nodejs.org/](https://nodejs.org/)
   - Run the installer and ensure **"Add to PATH"** is checked.
2. **MySQL Server (v8.0+) OR XAMPP** (Optional, but recommended for persistent database storage)
   - **Option A (Standalone MySQL)**: Install MySQL Community Server. Default port is `3306`.
   - **Option B (XAMPP)**: Download and open XAMPP, then click **"Start"** next to MySQL.
   - *Note: If MySQL is not installed, MediKiosk+ will still run in in-memory fallback mode.*

---

## ⚡ Step 3: One-Click Setup & Launch

On the new laptop, simply open the project folder and **double-click**:

👉 **`setup_and_launch.bat`**

### What `setup_and_launch.bat` does automatically:
1. **Verifies Node.js & npm** are installed.
2. **Creates `.env`** configuration if missing.
3. **Downloads & installs all dependencies** (`npm install`).
4. **Initializes the database**:
   - Connects to MySQL on `localhost:3306`.
   - Creates the `medikiosk` database if it doesn't exist.
   - Executes `schema.sql` to generate all **22 database tables**.
   - Generates verified bcrypt hashes and creates standard users.
   - Verifies tables and pre-loaded medical master data (12 languages, 8 chief complaints, triage station).
5. **Launches the full-stack server** and **automatically opens your web browser** at:
   - **`http://localhost:3000`**

---

## 🔑 Default Login Credentials

Use these accounts to access the clinical portals (Triage Desk, Doctor OPD Console, Admin Panel):

| Role | Username | Password | Purpose |
|---|---|---|---|
| **System Administrator** | `admin` | `Admin@123` | System settings, analytics, kiosk hardware config, user management |
| **Attending Doctor** | `doctor1` | `Doctor@123` | Live OPD queue, patient consult, FHIR records, SOCRATES review |
| **Triage / Staff Nurse** | `staff1` | `Staff@123` | Patient check-in, vitals measurement, queue reprioritization |

---

## 📁 Included Script Files

| File | Purpose | How to use |
|---|---|---|
| **`setup_and_launch.bat`** | First-time automated setup (checks Node, runs `npm install`, sets up MySQL, and launches site). | Double-click when setting up on a new laptop. |
| **`start_medikiosk.bat`** | Quick daily launcher (starts server and opens browser without reinstalling packages). | Double-click for everyday use. |
| **`verify_system.bat`** | Diagnostic utility (checks Node, npm, MySQL connection, and validates all 22 tables). | Double-click to diagnose any issues. |
| **`setup_db.cjs`** | Standalone Node script to create and verify the database & tables. | Run `npm run setup:db` or `node setup_db.cjs`. |

---

## ❓ Troubleshooting & FAQs

### 1. "Access denied for user 'root'@'localhost'"
- By default, `.env` uses `DB_PASSWORD="root"`. If your MySQL root user has a blank password or different password:
- When running `setup_and_launch.bat`, the script will automatically test common passwords or prompt you in the terminal to enter your MySQL password, and automatically update your `.env` file!
- Or, you can manually open `.env` in Notepad and change:
  ```env
  DB_PASSWORD="your_mysql_password_here"
  ```

### 2. "Port 3000 is already in use"
- You can change the port in `.env`:
  ```env
  PORT="3001"
  APP_URL="http://localhost:3001"
  ```

### 3. "MySQL service is not running"
- If using MySQL Community Server: Press `Win + R`, type `services.msc`, locate `MySQL80` (or `MySQL`), right-click and choose **Start**.
- If using XAMPP: Open XAMPP Control Panel and click **Start** next to MySQL.
- If MySQL is stopped, the application will automatically run using its built-in in-memory fallback datastore so the kiosk can still be tested immediately!

### 4. Optional Gemini AI Features
- If you have a Google Gemini API Key, open `.env` and paste it:
  ```env
  GEMINI_API_KEY="your-gemini-api-key"
  ```
- *Even without an API key, MediKiosk+ includes a comprehensive clinical fallback engine that handles symptoms, translations, and triage.*

