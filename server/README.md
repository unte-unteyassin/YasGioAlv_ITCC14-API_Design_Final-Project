# XU EcoLab — Backend (Express)

Implements `ITCC14API_YasGioAlv_Final.yaml` exactly: same routes, status codes,
and field names your React (Vite) frontend already expects via
`VITE_API_URL=http://localhost:5000/api`.

## Stack
- **Express** – routing/middleware
- **SQLite** (`better-sqlite3`) – single file, zero setup, no DB server to install/host
- **JWT** (`jsonwebtoken`) + **bcryptjs** – auth and password hashing
- **Cloudinary** – used only by the **frontend** for photo upload (unsigned
  preset, see root `.env.example`). This backend never calls Cloudinary; it
  just stores whatever `photoUrl` string the client sends with a report.

## Setup
```bash
cd server
npm install
cp .env.example .env     # fill in JWT_SECRET and admin seed credentials
npm run seed:admin        # creates your one admin/lab-technician account
npm run dev                # or: npm start
```
The API will be at `http://localhost:5000/api`, matching the frontend's
`VITE_API_URL`. `CORS_ORIGIN` in `.env` should match wherever your
groupmate's Vite dev server runs (default Vite port is `5173`).

Create at least one laboratory before testing report creation:
```
POST /api/laboratories   (as the seeded admin)
{ "laboratoryCode": "ICT-LAB-03", "name": "Computer Lab 3", "building": "ICT Building", "floor": 2 }
```

## Folder structure
```
server/
├── src/
│   ├── server.js            # starts the HTTP server
│   ├── app.js                # express app: middleware + route mounting
│   ├── config/db.js          # SQLite connection + table schema
│   ├── middleware/
│   │   ├── auth.js            # authenticate (JWT) + requireAdmin
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── validators.js
│   ├── models/                # one file per table, raw SQL only
│   │   ├── userModel.js
│   │   ├── laboratoryModel.js
│   │   ├── reportModel.js
│   │   └── statusUpdateModel.js
│   ├── controllers/            # request handling + business rules
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── laboratoryController.js
│   │   └── reportController.js
│   ├── routes/                  # just wires paths -> middleware -> controller
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── laboratoryRoutes.js
│   │   └── reportRoutes.js
│   └── seedAdmin.js              # one-off script to create the first admin
├── package.json
└── .env.example
```

## Routes implemented
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/register | public | always creates role `user` |
| POST | /api/auth/login | public | returns JWT + user |
| GET | /api/users/me | any user | |
| GET | /api/reports | any user | filters: status, wasteType, laboratoryCode, mine, page, limit |
| POST | /api/reports | any user | starts at status `pending` |
| GET | /api/reports/:reportId | any user | |
| PUT | /api/reports/:reportId | owner (pending only) or admin | |
| DELETE | /api/reports/:reportId | owner (pending only) or admin | cascades status history |
| PATCH | /api/reports/:reportId/status | admin only | pending→verified→resolved only |
| GET | /api/reports/:reportId/status-updates | any user | history, oldest first |
| GET | /api/laboratories | any user | filter: building |
| POST /PUT /DELETE | /api/laboratories... | admin only | delete blocked (409) while reports reference it |

All error responses share one shape: `{ "error": "...", "details": "..." }`.
