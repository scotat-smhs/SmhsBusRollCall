# Bus Roll Call System

A multi-platform RFID roll call system for school buses. The system uses ESP32-based hardware scanners, Cloudflare Workers for the backend, and modern web interfaces for both users and administrators.

## Project Structure

- **`/admin-frontend`**: Admin management panel (Vite/TS/HTML). Deployed on **Cloudflare Pages**.
- **`/backend-cloudflare`**: Serverless backend running on **Cloudflare Workers** using Hono and Cloudflare D1 (SQLite).
- **`/frontend`**: User dashboard (Vite/TS). Deployed on **Cloudflare Pages**. Utilizes Web Bluetooth (GATT) to connect directly to scanners.

- **`/BusRollCall`**: ESP32-C3 firmware for the RFID scanner (RC522 + BLE).
- **`/BusRollCallKey`**: ESP32-C3 firmware for key programming/utility.

## Architecture

- **Database**: Cloudflare D1 (SQLite) for the serverless backend, with support for Firestore-based deployments.
- **Hardware**: ESP32-C3 SuperMini scanning RC522 RFID tags and broadcasting data via BLE.
- **Communication**: Web Bluetooth (GATT) for direct device-to-browser interaction; REST API for batch syncing and management.
- **Time Slots**: Automatic categorization of scans based on Taipei time (Morning, Afternoon, Evening).

## Core Features

- **Time-Based Slotting**: Scans are automatically categorized by Taipei time (e.g., Morning `07:00-09:00`, Afternoon `16:00-18:00`).
- **Identity Resolution**: Supports multiple list types (Arrival/Departure) and handles identity resolution via `uid_listType` document IDs with automatic fallbacks.
- **Temporary Riders**: Admin can assign students to specific buses for single trips with automatic occupancy tracking.
- **Photo Library**: Integrated student photo management with support for Base64-encoded images.

## Getting Started

### 1. Backend (Cloudflare Workers)
The backend manages student records and roll call logs.
```bash
cd backend-cloudflare
npm install
npm run db:init   # Initialize local D1 database
npm run dev       # Start local development server
```

### 2. User Frontend
Web-based scanner interface for bus drivers/monitors.
```bash
cd frontend
npm install
npm run dev
```
*Note: Requires a browser with Web Bluetooth support (Chrome/Edge).*

### 3. Admin Frontend
Management interface for school administrators.
```bash
cd admin-frontend
npm install
npm run dev
```

### 4. ESP32 Firmware
- Open `BusRollCall/BusRollCall.ino` in the Arduino IDE.
- Install necessary libraries (MFRC522, NimBLE-Arduino).
- Select **ESP32C3 Dev Module** and flash.

## Deployment

### Cloudflare Ecosystem
The entire software stack is hosted on Cloudflare:
- **Backend**: Deployed as a **Cloudflare Worker**.
- **Frontends**: Deployed as **Cloudflare Pages**.

```bash
# Backend (Worker)
cd backend-cloudflare && npm run deploy

# Frontends (Pages)
cd admin-frontend && npm run deploy
cd frontend && npm run deploy
```

## Development Conventions
Refer to [GEMINI.md](./GEMINI.md) for detailed technical specifications, including BLE UUIDs, identity resolution logic, and UI color standards.
