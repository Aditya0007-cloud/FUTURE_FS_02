# Client Lead Management System (Mini CRM)

A full-stack mini CRM for managing client leads generated from website contact forms.

## Features

- Secure admin login with JWT authentication
- Lead listing with search, source filter, status filter, and sorting
- Create, update, and delete leads
- Lead statuses: new, contacted, converted, lost
- Notes and follow-up reminders for each lead
- Dashboard stats for lead count, active leads, converted leads, follow-ups, and pipeline value
- MongoDB support through `MONGODB_URI`
- Local JSON persistence fallback for quick demo runs

## Tech Stack

- Frontend: React, Vite, CSS, lucide-react
- Backend: Node.js, Express
- Database: MongoDB with Mongoose when `MONGODB_URI` is configured
- Auth: bcryptjs and JSON Web Tokens

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open the frontend URL printed by Vite. In this workspace it used:

```text
http://127.0.0.1:5174/
```

The API runs at:

```text
http://127.0.0.1:5001/
```

## Admin Login

Default local credentials:

```text
Email: admin@crm.local
Password: admin12345
```

Change these in `.env` before deploying:

```env
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@crm.local
ADMIN_PASSWORD=admin12345
MONGODB_URI=mongodb://127.0.0.1:27017/mini-crm
```

If `MONGODB_URI` is empty, the app stores demo data in `server/data/leads.json`.

## Useful Scripts

```bash
npm run dev
npm run build
npm run server
npm run client
```
