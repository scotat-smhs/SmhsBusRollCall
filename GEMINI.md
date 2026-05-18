# Bus Roll Call Project

A multi-platform system for scanning RFID cards to perform bus roll calls. The system consists of an ESP32-based hardware scanner, a native iOS application, a web-based user dashboard, and an admin management panel.

## Project Overview

- **Hardware (ESP32-C3 SuperMini):** Scans RC522 RFID tags, provides buzzer feedback, and broadcasts data over BLE.
- **Backend (Cloudflare Workers/Hono):** Serverless backend using **Cloudflare D1** (SQLite) for storage.
- **User Dashboard (Vite/TS):** Web-based scanner interface utilizing Web Bluetooth (GATT) with instant local-only lookups. Deployed on **Cloudflare Pages**.
- **Admin Panel (Vite/HTML):** management interface for exports, temporary rider assignments, and a native D1-backed Photo Library. Deployed on **Cloudflare Pages**.

## Architecture

- **Database:** Uses **Cloudflare D1** as the exclusive database. Documents use a `uid_type` format for student records to handle multiple trip lists.
- **Photos:** Student photos are stored as **Base64 strings** directly in the D1 database.
- **Roll Call Slots:** Scans are automatically categorized by Taipei time:
    - `07:00-09:00` (Morning)
    - `16:00-18:00` (Afternoon)
    - `19:00-21:00` (Evening)
    - `Not in time` (Fallback)
- **Sync Workflow:** Clients perform instant lookups against a locally cached student list for sub-100ms response times. Scans are queued locally and synced in batches to the backend.

## Key Features

### 1. Temporary Riders
Admin can assign any student (even those not in the master database) to a specific bus for a specific date and time slot.
- Requires 10-digit UID.
- Automatic occupancy tracking with overflow warnings.
- Assignments are automatically hidden 1 day after the trip.

### 2. Photo Library
Native grid-style gallery in the Admin Panel for managing student photos.
- Bulk Upload: Match filenames to badge numbers (e.g., `211002.jpg`) for mass updates.
- Real-time Search: Filter by name, UID, or badge number.

## Deployment

### Cloudflare Ecosystem
The entire software stack is hosted on Cloudflare:
- **Backend (Worker):**
    - `npm run db:init`: Initialize the database schema locally.
    - `npm run dev`: Start local development server.
    - `npm run deploy`: Deploy to Cloudflare Workers.
- **Frontends (Pages):**
    - `npm run deploy`: Build and deploy to Cloudflare Pages.

## Development Conventions

- **BLE UUIDs:** 
    - Device Name: `ESP32-C3-Scanner`
    - RFID Service: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
    - RFID Characteristic: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **Identity Resolution:**
    - Document ID format: `${uid}_${listType}` (e.g., `0012345678_arrival`).
    - Fallback: Checks `uid_arrival` -> `uid` (legacy) -> Global UID Search.
- **Data Format:** 
    - Batch Sync: `POST /api/rollcall/batch` with an array of `{uid, timestamp}` objects.
- **UI Colors:**
    - **Green:** Success (Correct bus).
    - **Yellow:** Warning (Wrong bus).
    - **Red:** Error (Unknown tag).
    - **Gray:** Idle/No Bus selected.
