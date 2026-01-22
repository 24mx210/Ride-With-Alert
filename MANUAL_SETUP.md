# RideWithAlert - Complete Manual Setup Guide

This guide provides detailed step-by-step instructions to set up and run the RideWithAlert system from scratch.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Project Setup](#project-setup)
5. [Database Migration](#database-migration)
6. [Initial Data Setup](#initial-data-setup)
7. [Running the Application](#running-the-application)
8. [Verification & Testing](#verification--testing)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software

1. **Node.js** (v18.0.0 or higher)
   - Download from: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **PostgreSQL** (v12.0 or higher)
   - Download from: https://www.postgresql.org/download/
   - Verify installation:
     ```bash
     psql --version
     ```

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/downloads

### System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 500MB free space
- **Browser**: Chrome, Firefox, Edge, or Safari (latest versions)

---

## 🗄️ Database Setup

### Step 1: Install PostgreSQL

1. Download PostgreSQL installer from https://www.postgresql.org/download/
2. Run the installer
3. During installation:
   - Remember the **postgres user password** (you'll need this)
   - Default port: **5432** (keep this unless you have conflicts)
   - Install PostgreSQL Server, pgAdmin, and Command Line Tools

**⚠️ Important: Stack Builder Certificate Warning**

After PostgreSQL installation completes, you may see a **Stack Builder** wizard with a certificate verification warning. This is common and usually safe:

**What to do:**
- **Option 1 (Recommended):** Click **"No"** or **"Cancel"** to skip Stack Builder
  - Stack Builder is optional - it's for installing additional PostgreSQL tools
  - You don't need it for this project
  - PostgreSQL core installation is already complete

- **Option 2:** If you want to use Stack Builder:
  - Click **"Yes"** to continue (if you trust your network connection)
  - The warning appears due to SSL certificate verification issues
  - This is usually a network/firewall issue, not a security threat
  - You can safely proceed if you downloaded PostgreSQL from the official website

**Note:** For this project, you only need:
- ✅ PostgreSQL Server
- ✅ pgAdmin (GUI tool)
- ✅ Command Line Tools

Stack Builder is **not required** - you can safely skip it!

### Step 2: Add PostgreSQL to PATH (Windows Only)

**If `psql` command is not recognized, add PostgreSQL to your PATH:**

1. **Find PostgreSQL Installation Directory:**
   - Default location: `C:\Program Files\PostgreSQL\16\bin`
   - For PostgreSQL 16.11-2 (your version): `C:\Program Files\PostgreSQL\16\bin`

2. **Add to PATH (Method 1 - PowerShell - Current Session):**
   ```powershell
   # For PostgreSQL 16 (your version)
   $env:Path += ";C:\Program Files\PostgreSQL\16\bin"
   
   # Verify
   psql --version
   # Should show: psql (PostgreSQL) 16.11
   ```

3. **Add to PATH (Method 2 - System Environment Variables - Permanent):**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → Click "Environment Variables"
   - Under "System variables", find "Path" → Click "Edit"
   - Click "New" → Add: `C:\Program Files\PostgreSQL\16\bin`
   - Click "OK" on all dialogs
   - **Restart PowerShell** for changes to take effect

4. **Verify PATH is set:**
   ```powershell
   # Check if PostgreSQL bin is in PATH
   $env:Path -split ';' | Select-String "PostgreSQL"
   
   # Test psql command
   psql --version
   # Should show: psql (PostgreSQL) 16.11
   ```

### Step 3: Start PostgreSQL Service

**Windows:**
```powershell
# Open PowerShell as Administrator
# Find PostgreSQL service name first
Get-Service | Where-Object {$_.DisplayName -like "*PostgreSQL*"}

# For PostgreSQL 16, service name is typically: postgresql-x64-16
# Start PostgreSQL service
Start-Service postgresql-x64-16

# OR using net command
net start postgresql-x64-16

# Verify service is running
Get-Service | Where-Object {$_.DisplayName -like "*PostgreSQL*"}
# Status should show: Running
```

**macOS:**
```bash
# Start PostgreSQL service
brew services start postgresql@14
# OR
pg_ctl -D /usr/local/var/postgres start
```

**Linux:**
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
# Enable auto-start on boot
sudo systemctl enable postgresql
```

### Step 4: Create Database

**Option A: Using pgAdmin (GUI) - Recommended for Windows**

1. **Open pgAdmin:**
   - Search for "pgAdmin" in Start Menu
   - Or navigate to: `C:\Program Files\PostgreSQL\<version>\pgAdmin 4\bin\pgAdmin4.exe`

2. **Connect to Server:**
   - Enter your postgres user password (set during installation)
   - Click "Save Password" if desired

3. **Create Database:**
   - Right-click on "Databases" → "Create" → "Database"
   - Database name: `ridewithalert`
   - Owner: `postgres` (or your user)
   - Click "Save"

**Option B: Using Command Line (After adding to PATH)**

**Windows PowerShell:**
```powershell
# Connect to PostgreSQL (will prompt for password)
psql -U postgres

# If connection fails, try with full path (for PostgreSQL 16):
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres

# Enter your postgres password when prompted

# Create database
CREATE DATABASE ridewithalert;

# Create a dedicated user (optional but recommended)
CREATE USER ridewithalert_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ridewithalert TO ridewithalert_user;

# Exit psql
\q
```

**macOS/Linux:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Enter your postgres password when prompted

# Create database
CREATE DATABASE ridewithalert;

# Create a dedicated user (optional but recommended)
CREATE USER ridewithalert_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ridewithalert TO ridewithalert_user;

# Exit psql
\q
```

**Option C: Using SQL File (Windows - If psql not in PATH)**

1. Create a file `create_db.sql`:
   ```sql
   CREATE DATABASE ridewithalert;
   CREATE USER ridewithalert_user WITH PASSWORD 'your_secure_password_here';
   GRANT ALL PRIVILEGES ON DATABASE ridewithalert TO ridewithalert_user;
   ```

2. Run using full path (for PostgreSQL 16):
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f create_db.sql
   ```

### Step 5: Verify Database Creation

**Using pgAdmin (Windows - Easiest):**
1. Open pgAdmin
2. Expand "Servers" → "PostgreSQL <version>" → "Databases"
3. You should see `ridewithalert` in the list

**Using Command Line:**
```powershell
# Windows (after adding to PATH)
psql -U postgres -l

# Windows (using full path if not in PATH - for PostgreSQL 16)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -l

# You should see 'ridewithalert' in the list
```

---

## ⚙️ Environment Configuration

### Step 1: Create `.env` File

Create a `.env` file in the project root directory (`d:\2\Ride-With-Alert\.env`)

### Step 2: Configure Environment Variables

**For Windows (PowerShell):**
```powershell
# Navigate to project directory
cd D:\2\Ride-With-Alert

# Create .env file
New-Item -ItemType File -Path .env -Force

# Add content to .env file
@"
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/ridewithalert
PORT=5000
NODE_ENV=development
POLICE_PHONE=9944352689
HOSPITAL_PHONE=9876543210
FAST2SMS_API_KEY=
"@ | Out-File -FilePath .env -Encoding utf8
```

**For Windows (CMD):**
```cmd
cd D:\2\Ride-With-Alert
echo DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/ridewithalert > .env
echo PORT=5000 >> .env
echo NODE_ENV=development >> .env
echo POLICE_PHONE=9944352689 >> .env
echo HOSPITAL_PHONE=9876543210 >> .env
echo FAST2SMS_API_KEY= >> .env
```

**For macOS/Linux:**
```bash
cd /path/to/Ride-With-Alert

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/ridewithalert
PORT=5000
NODE_ENV=development
POLICE_PHONE=9944352689
HOSPITAL_PHONE=9876543210
FAST2SMS_API_KEY=
EOF
```

### Step 3: Set Up FREE SMS with Fast2SMS (100% Free!)

To send **real SMS messages** for FREE (no payment required!), use Fast2SMS:

1. **Sign up for Fast2SMS (FREE):**
   - Go to https://www.fast2sms.com/
   - Click "Sign Up" or "Register"
   - Fill in your details (name, email, mobile, password)
   - Verify your email and mobile
   - **You'll get ₹50 FREE credit!** 🎁

2. **Get Your API Key:**
   - Log in to your Fast2SMS account
   - Go to "API" section in dashboard
   - Click "Generate API Key" or find existing key
   - Copy the API key

3. **Add Fast2SMS API Key to `.env`:**
   ```env
   FAST2SMS_API_KEY=your_api_key_here
   ```

4. **Note:** 
   - If API key is **not provided**, the system will simulate SMS (console logs only)
   - If API key **is provided**, real SMS messages will be sent
   - **100% FREE** - No payment required!
   - Works with Indian phone numbers (10 digits)
   - See `FREE_SMS_SETUP.md` for detailed instructions

### Step 4: Update `.env` File Values

Open `.env` file in a text editor and replace:

1. **`your_postgres_password`** → Your actual PostgreSQL postgres user password
2. **`9944352689`** → Your police contact phone number (10 digits for India)
3. **`9876543210`** → Your hospital contact phone number (10 digits for India)
4. **Fast2SMS API Key** (if using real SMS):
   - `FAST2SMS_API_KEY` → Your Fast2SMS API key

**Example `.env` file (with Fast2SMS - FREE!):**
```env
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/ridewithalert
PORT=5000
NODE_ENV=development
POLICE_PHONE=9944352689
HOSPITAL_PHONE=9876543210
FAST2SMS_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

**Example `.env` file (without Fast2SMS - SMS simulation only):**
```env
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/ridewithalert
PORT=5000
NODE_ENV=development
POLICE_PHONE=9944352689
HOSPITAL_PHONE=9876543210
```

### Step 5: Verify Environment Variables

**Windows (PowerShell):**
```powershell
# Check if .env file exists
Test-Path .env

# View .env content (password will be visible)
Get-Content .env
```

**macOS/Linux:**
```bash
# Check if .env file exists
ls -la .env

# View .env content
cat .env
```

---

## 📦 Project Setup

### Step 1: Navigate to Project Directory

**Windows:**
```powershell
cd D:\2\Ride-With-Alert
```

**macOS/Linux:**
```bash
cd /path/to/Ride-With-Alert
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected Output:**
- This will install all required packages
- May take 2-5 minutes depending on internet speed
- You should see: `added XXX packages` at the end

**If you encounter errors:**
- Ensure Node.js is properly installed
- Try: `npm cache clean --force` then `npm install` again
- On Windows, you may need to run PowerShell as Administrator

### Step 3: Verify Installation

```bash
# Check if node_modules exists
ls node_modules  # macOS/Linux
dir node_modules  # Windows CMD
Get-ChildItem node_modules  # Windows PowerShell

# Verify key packages
npm list express
npm list drizzle-orm
npm list socket.io
```

---

## 🗃️ Database Migration

### Step 1: Verify Database Connection

Ensure your `.env` file has the correct `DATABASE_URL` and PostgreSQL is running.

### Step 2: Run Database Migration

```bash
npm run db:push
```

**Expected Output:**
```
✓ Generated SQL migration
✓ Pushed schema to database
```

**What this does:**
- Creates all required tables:
  - `managers`
  - `drivers`
  - `vehicles`
  - `trips`
  - `emergencies`
  - `fuel_logs`
  - `service_logs`

### Step 3: Verify Tables Created

**Using psql:**
```bash
psql -U postgres -d ridewithalert

# List all tables
\dt

# You should see all 7 tables listed
# Exit
\q
```

**Using pgAdmin:**
1. Connect to `ridewithalert` database
2. Expand "Schemas" → "public" → "Tables"
3. Verify all 7 tables are present

---

## 📊 Initial Data Setup

### Step 1: Start the Application (First Time)

The application will automatically seed initial data on first run:

```bash
npm run dev
```

**Wait for:**
- Server to start (you'll see: `serving on port 5000`)
- Seed messages in console:
  - `Seeded Manager: admin / password123`
  - `Seeded maintenance data for vehicle: ...` (if vehicles exist)

### Step 2: Verify Initial Manager Account

**Using pgAdmin (Windows - Recommended):**
1. Open pgAdmin
2. Connect to `ridewithalert` database
3. Right-click on `managers` table → "View/Edit Data" → "All Rows"
4. You should see:
   - `id`: 1
   - `username`: admin
   - `password`: password123

**Using psql (Command Line):**
```powershell
# Windows (after adding to PATH)
psql -U postgres -d ridewithalert

# Windows (using full path if not in PATH - for PostgreSQL 16)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d ridewithalert

# Check manager
SELECT * FROM managers;

# You should see:
# id | username | password    | created_at
# 1  | admin    | password123 | 2024-...

# Exit
\q
```

**macOS/Linux:**
```bash
psql -U postgres -d ridewithalert

# Check manager
SELECT * FROM managers;

# Exit
\q
```

**Default Manager Credentials:**
- **Username:** `admin`
- **Password:** `password123`
- ⚠️ **CHANGE THIS IN PRODUCTION!**

### Step 3: Manual Data Entry (Optional)

If you want to add test data manually:

**Using pgAdmin (Windows - Recommended):**
1. Open pgAdmin
2. Connect to `ridewithalert` database
3. Right-click on database → "Query Tool"
4. Run these SQL commands:
   ```sql
   -- Insert a test driver
   INSERT INTO drivers (driver_number, name, phone_number, license_number) 
   VALUES ('DRV-001', 'John Doe', '+1234567890', 'DL123456');

   -- Insert a test vehicle
   INSERT INTO vehicles (vehicle_number, vehicle_type, fuel_capacity, current_fuel) 
   VALUES ('AMB-001', 'Ambulance', 50, 85);
   ```
5. Click "Execute" (F5)
6. Verify by viewing tables

**Using psql (Command Line):**
```powershell
# Windows (after adding to PATH)
psql -U postgres -d ridewithalert

# Windows (using full path if not in PATH)
& "C:\Program Files\PostgreSQL\<version>\bin\psql.exe" -U postgres -d ridewithalert

# Run SQL commands
INSERT INTO drivers (driver_number, name, phone_number, license_number) 
VALUES ('DRV-001', 'John Doe', '+1234567890', 'DL123456');

INSERT INTO vehicles (vehicle_number, vehicle_type, fuel_capacity, current_fuel) 
VALUES ('AMB-001', 'Ambulance', 50, 85);

-- Verify
SELECT * FROM drivers;
SELECT * FROM vehicles;

-- Exit
\q
```

**macOS/Linux:**
```bash
psql -U postgres -d ridewithalert

# Run SQL commands (same as above)
# Exit
\q
```

---

## 🚀 Running the Application

### Development Mode

**Step 1: Start the Server**

```bash
npm run dev
```

**Expected Output:**
```
serving on port 5000
Seeded Manager: admin / password123
```

**Step 2: Access the Application**

Open your browser and navigate to:
- **Main Application:** http://localhost:5000
- **Manager Login:** http://localhost:5000/login/manager
- **Driver Login:** http://localhost:5000/login/driver
- **Police Dashboard:** http://localhost:5000/police/dashboard
- **Hospital Dashboard:** http://localhost:5000/hospital/dashboard

### Production Mode

**Step 1: Build the Application**

```bash
npm run build
```

**Step 2: Start Production Server**

```bash
npm start
```

**Note:** Ensure `NODE_ENV=production` in `.env` file

---

## ✅ Verification & Testing

### Test 1: Manager Login

1. Navigate to: http://localhost:5000/login/manager
2. Enter credentials:
   - Username: `admin`
   - Password: `password123`
3. Click "Sign In"
4. **Expected:** Redirected to Manager Dashboard

### Test 2: Register Vehicle

1. In Manager Dashboard, go to "Fleet Management" tab
2. Fill "Add Vehicle" form:
   - Vehicle Number: `AMB-001`
   - Type: `Ambulance`
   - Fuel Capacity: `50`
3. Click "Register Vehicle"
4. **Expected:** Success toast, vehicle appears in list

### Test 3: Register Driver

1. In "Fleet Management" tab
2. Fill "Add Driver" form:
   - Driver Number: `DRV-001`
   - Name: `John Doe`
   - Phone Number: `+1234567890`
   - License Number: `DL123456`
3. Click "Create Profile"
4. **Expected:** Success toast, driver appears in list

### Test 4: Assign Trip

1. In "Fleet Management" tab
2. In "Assign Trip" section:
   - Select Vehicle: `AMB-001`
   - Select Driver: `DRV-001`
3. Click "Assign Trip"
4. **Expected:**
   - Success toast with temporary credentials
   - SMS simulation message in server console
   - Trip appears in "Active Trips" list

### Test 5: Driver Login

1. Navigate to: http://localhost:5000/login/driver
2. Use temporary credentials from Test 4
3. Click "Start Trip"
4. **Expected:** Redirected to Driver Dashboard with trip info

### Test 6: Emergency Flow

1. As driver, click "SOS" button
2. Grant camera and location permissions
3. Wait 45 seconds for video recording
4. **Expected:**
   - Manager dashboard shows emergency alert with alarm
   - Police dashboard shows emergency (read-only)
   - Hospital dashboard shows emergency (read-only)
   - SMS notifications sent (visible in server console)

### Test 7: Acknowledge Emergency

1. In Manager Dashboard, click emergency alert
2. Click "Stop Alarm & Acknowledge"
3. **Expected:**
   - Alarm stops on all dashboards
   - Driver dashboard shows acknowledgment message

### Test 8: Cancel Trip

1. In Manager Dashboard, "Fleet Management" tab
2. Find active trip in "Active Trips" list
3. Click "Cancel Trip"
4. **Expected:**
   - Trip status changes to COMPLETED
   - SMS cancellation message sent (visible in console)
   - Driver cannot login with same credentials

### Test 9: Update Vehicle

1. In Manager Dashboard, "Fleet Management" tab
2. Scroll to "Update Vehicle" section
3. Select a vehicle from dropdown
4. Update Type or Fuel Capacity
5. Click "Update Vehicle"
6. **Expected:** Success toast, vehicle data updated

### Test 10: Update Driver

1. In Manager Dashboard, "Fleet Management" tab
2. Scroll to "Update Driver" section
3. Select a driver from dropdown
4. Update Name, Phone, or License
5. Click "Update Driver"
6. **Expected:** Success toast, driver data updated

---

## 🔍 Troubleshooting

### Issue 1: Database Connection Error

**Error:** `DATABASE_URL must be set` or `Connection refused`

**Solutions:**
1. **Verify PostgreSQL is running:**
   ```powershell
   # Windows PowerShell
   Get-Service | Where-Object {$_.DisplayName -like "*PostgreSQL*"}
   
   # If not running, start it:
   Start-Service postgresql-x64-14  # Replace with your version
   
   # macOS/Linux
   sudo systemctl status postgresql
   ```

2. **Check `.env` file exists and has correct `DATABASE_URL`:**
   ```powershell
   # Windows PowerShell
   Test-Path .env
   Get-Content .env
   
   # Windows CMD
   type .env
   
   # macOS/Linux
   cat .env
   ```

3. **Test database connection manually:**
   
   **Using pgAdmin (Windows - Easiest):**
   - Open pgAdmin
   - Try connecting to PostgreSQL server
   - If connection fails, check service is running
   
   **Using Command Line:**
   ```powershell
   # Windows (after adding to PATH)
   psql -U postgres -d ridewithalert
   
   # Windows (using full path if not in PATH - for PostgreSQL 16)
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d ridewithalert
   ```

4. **Verify password in `DATABASE_URL` matches your PostgreSQL password:**
   - Check `.env` file: `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ridewithalert`
   - Ensure password matches the one set during PostgreSQL installation

5. **Check PostgreSQL is listening on correct port:**
   ```powershell
   # Windows - Check if port 5432 is in use
   netstat -ano | findstr :5432
   ```

### Issue 2: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solutions:**

**Option A: Change Port**
1. Edit `.env` file
2. Change `PORT=5000` to `PORT=5001` (or any available port)
3. Restart server

**Option B: Kill Process Using Port**

**Windows:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
# Find process using port 5000
lsof -ti:5000

# Kill process
kill -9 $(lsof -ti:5000)
```

### Issue 3: Database Migration Fails

**Error:** `relation already exists` or migration errors

**Solutions:**

1. **Reset Database (Development Only):**

   **Using pgAdmin (Windows - Recommended):**
   1. Open pgAdmin
   2. Connect to `ridewithalert` database
   3. Right-click database → "Query Tool"
   4. Run this SQL:
      ```sql
      DROP TABLE IF EXISTS emergencies CASCADE;
      DROP TABLE IF EXISTS trips CASCADE;
      DROP TABLE IF EXISTS fuel_logs CASCADE;
      DROP TABLE IF EXISTS service_logs CASCADE;
      DROP TABLE IF EXISTS vehicles CASCADE;
      DROP TABLE IF EXISTS drivers CASCADE;
      DROP TABLE IF EXISTS managers CASCADE;
      ```
   5. Click "Execute" (F5)
   6. Run migration again: `npm run db:push`

   **Using psql (Command Line):**
   ```powershell
   # Windows (using full path if not in PATH - for PostgreSQL 16)
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d ridewithalert
   
   # Drop all tables
   DROP TABLE IF EXISTS emergencies CASCADE;
   DROP TABLE IF EXISTS trips CASCADE;
   DROP TABLE IF EXISTS fuel_logs CASCADE;
   DROP TABLE IF EXISTS service_logs CASCADE;
   DROP TABLE IF EXISTS vehicles CASCADE;
   DROP TABLE IF EXISTS drivers CASCADE;
   DROP TABLE IF EXISTS managers CASCADE;
   
   # Exit
   \q
   
   # Run migration again
   npm run db:push
   ```

2. **Check for conflicting migrations:**
   - Delete `migrations` folder if exists
   - Run `npm run db:push` again

### Issue 4: Camera Not Working

**Error:** Camera permission denied or not accessible

**Solutions:**

1. **Browser Permissions:**
   - Chrome: Settings → Privacy and Security → Site Settings → Camera
   - Firefox: Settings → Privacy & Security → Permissions → Camera
   - Edge: Settings → Site Permissions → Camera

2. **HTTPS Requirement:**
   - Camera requires HTTPS in production
   - For development, use `localhost` (works without HTTPS)

3. **Check if camera is used by another app:**
   - Close other applications using camera
   - Restart browser

### Issue 5: GPS Location Not Working

**Error:** Location permission denied

**Solutions:**

1. **Browser Permissions:**
   - Allow location access when prompted
   - Check browser settings for location permissions

2. **System Settings:**
   - **Windows:** Settings → Privacy → Location → Allow apps to access location
   - **macOS:** System Preferences → Security & Privacy → Location Services
   - **Linux:** Check browser-specific location settings

3. **Test GPS:**
   ```javascript
   // Open browser console (F12)
   navigator.geolocation.getCurrentPosition(
     (pos) => console.log("GPS works:", pos.coords),
     (err) => console.error("GPS error:", err)
   );
   ```

### Issue 6: Socket.IO Connection Failed

**Error:** WebSocket connection errors in browser console

**Solutions:**

1. **Check server is running:**
   - Verify server started successfully
   - Check for errors in server console

2. **Firewall Settings:**
   - Allow port 5000 (or your PORT) through firewall
   - Check if antivirus is blocking connections

3. **Browser Console:**
   - Open browser DevTools (F12)
   - Check Network tab for WebSocket connection
   - Verify Socket.IO client is connecting

### Issue 7: Video Upload Fails

**Error:** Video not uploading or file too large

**Solutions:**

1. **Check uploads directory:**
   ```bash
   # Verify directory exists
   ls uploads  # macOS/Linux
   dir uploads  # Windows
   ```

2. **Create uploads directory if missing:**
   ```bash
   # Windows PowerShell
   New-Item -ItemType Directory -Force -Path uploads
   
   # macOS/Linux
   mkdir -p uploads
   ```

3. **Check disk space:**
   ```bash
   # Windows
   fsutil volume diskfree C:
   
   # macOS/Linux
   df -h
   ```

### Issue 8: SMS Not Appearing

**Note:** SMS is simulated and appears in server console, not actually sent

**To verify:**
1. Check server console output
2. Look for `[SMS SIMULATION]` messages
3. These are logged, not actually sent via SMS service

### Issue 9: TypeScript Errors

**Error:** Type errors during build

**Solutions:**

1. **Install missing type definitions:**
   ```bash
   npm install --save-dev @types/node @types/express
   ```

2. **Check tsconfig.json:**
   - Ensure `"types": ["node"]` is included
   - Verify `"moduleResolution": "node"` is set

3. **Clean and rebuild:**
   ```bash
   rm -rf node_modules package-lock.json  # macOS/Linux
   rmdir /s node_modules package-lock.json  # Windows
   npm install
   ```

### Issue 10: Dependencies Installation Fails

**Error:** npm install errors

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json  # macOS/Linux
   rmdir /s /q node_modules package-lock.json  # Windows
   npm install
   ```

3. **Use specific Node.js version:**
   - Ensure Node.js v18+ is installed
   - Consider using `nvm` (Node Version Manager) for version control

---

## 📝 Post-Setup Checklist

After successful setup, verify:

- [ ] PostgreSQL is running
- [ ] Database `ridewithalert` exists
- [ ] All 7 tables created (managers, drivers, vehicles, trips, emergencies, fuel_logs, service_logs)
- [ ] `.env` file configured correctly
- [ ] Dependencies installed (`node_modules` exists)
- [ ] Server starts without errors (`npm run dev`)
- [ ] Manager can login (admin/password123)
- [ ] Manager can register vehicle
- [ ] Manager can register driver
- [ ] Manager can assign trip
- [ ] Driver can login with temporary credentials
- [ ] Emergency flow works end-to-end
- [ ] Camera and GPS permissions work
- [ ] WebSocket connection established (green dot in manager dashboard)

---

## 🔐 Security Notes

### Production Deployment

Before deploying to production:

1. **Change Default Passwords:**
   - Change manager password from `password123`
   - Use strong, unique passwords

2. **Environment Variables:**
   - Never commit `.env` file to version control
   - Use secure environment variable management
   - Use strong database passwords

3. **HTTPS:**
   - Enable HTTPS for production
   - Required for camera and location APIs
   - Use SSL certificates

4. **Database Security:**
   - Use dedicated database user (not postgres)
   - Restrict database access
   - Enable SSL connections

5. **API Security:**
   - Implement rate limiting
   - Add authentication middleware
   - Use bcrypt for password hashing (currently plaintext for MVP)

---

## 📞 Support

### Common Commands Reference

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migration
npm run db:push

# Type check
npm run check

# Install dependencies
npm install
```

### Log Locations

- **Server logs:** Console output when running `npm run dev`
- **Browser logs:** Browser DevTools Console (F12)
- **Database logs:** PostgreSQL log files (location varies by OS)

### Getting Help

1. Check server console for error messages
2. Check browser console (F12) for client errors
3. Verify all prerequisites are installed
4. Ensure database is running and accessible
5. Check `.env` file configuration

---

## 🎯 Quick Start Summary

For experienced developers, here's the quick setup:

**Windows PowerShell:**
```powershell
# 1. Create PostgreSQL database (using pgAdmin or full path - for PostgreSQL 16)
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres ridewithalert

# OR use pgAdmin GUI to create database

# 2. Create .env file
@"
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ridewithalert
PORT=5000
NODE_ENV=development
POLICE_PHONE=9944352689
HOSPITAL_PHONE=9876543210
"@ | Out-File -FilePath .env -Encoding utf8

# 3. Install dependencies
npm install

# 4. Run migration
npm run db:push

# 5. Start server
npm run dev

# 6. Access application
# Open http://localhost:5000/login/manager
# Login: admin / password123
```

**macOS/Linux:**
```bash
# 1. Create PostgreSQL database
createdb ridewithalert

# 2. Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/ridewithalert
PORT=5000
NODE_ENV=development
POLICE_PHONE=9944352689
HOSPITAL_PHONE=9876543210
EOF

# 3. Install dependencies
npm install

# 4. Run migration
npm run db:push

# 5. Start server
npm run dev

# 6. Access application
# Open http://localhost:5000/login/manager
# Login: admin / password123
```

---

## 🪟 Windows-Specific PostgreSQL Setup

### Finding PostgreSQL Installation Path

If you're not sure where PostgreSQL is installed:

1. **Check Program Files:**
   ```powershell
   # List PostgreSQL installations
   Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue
   # For PostgreSQL 16.11-2, you should see: 16
   ```

2. **Check via Windows Services:**
   ```powershell
   # Find PostgreSQL service
   Get-Service | Where-Object {$_.DisplayName -like "*PostgreSQL*"} | Select-Object DisplayName, Name
   # For PostgreSQL 16, service name is: postgresql-x64-16
   ```

3. **Your Installation Path (PostgreSQL 16.11-2):**
   - `C:\Program Files\PostgreSQL\16\bin`
   - Full path to psql: `C:\Program Files\PostgreSQL\16\bin\psql.exe`
   - Full path to pgAdmin: `C:\Program Files\PostgreSQL\16\pgAdmin 4\bin\pgAdmin4.exe`

### Using pgAdmin Instead of Command Line

**If you prefer GUI over command line, you can do everything via pgAdmin:**

1. **Create Database:**
   - Open pgAdmin → Right-click "Databases" → "Create" → "Database"
   - Name: `ridewithalert`

2. **Run SQL Queries:**
   - Right-click database → "Query Tool"
   - Paste SQL and click "Execute" (F5)

3. **View Tables:**
   - Expand database → "Schemas" → "public" → "Tables"

4. **View/Edit Data:**
   - Right-click table → "View/Edit Data" → "All Rows"

**This eliminates the need to add PostgreSQL to PATH!**

---

**Last Updated:** 2024
**Version:** 1.0

For detailed information about system workflows, see the project documentation.
