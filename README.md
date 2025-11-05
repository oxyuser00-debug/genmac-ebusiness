# GenMac Application — README

> Quick setup guide for running the backend and frontend locally.

---

## Prerequisites

* **Node.js**: Install **Node v24.11.0 (LTS)**.

  * Download: [https://nodejs.org/en/download](https://nodejs.org/en/download)
* **npm** (comes with Node)
* A terminal / command prompt

---

## Overview

This repo contains a backend (Express + SQLite/Postgres-style setup) and a frontend. The steps below show how to configure environment variables, initialize the database with sample data, and run both backend and frontend for local development.

> These instructions assume your repo contains two folders named `backend/` and `frontend/` and that you run commands from your project root unless otherwise specified.

---

## Backend setup

1. Open a terminal and `cd` into the `backend/` folder:

```bash
cd backend
```

2. Create a `.env` file in the `backend/` folder and paste the following **exactly** (do not commit this file to source control):

```
PORT=5000
JWT_SECRET=supersecretkey123
STRIPE_SECRET_KEY=sk_test_51SOWWcPFvjeRz9zNES1cTyyLwJftWuCfJZjZWr7vqcaX4xEqiXFH952rZoCCUi1Yqrn7dK90bx3ypic31j9Xsdow00VnVn9nzS
```

> ⚠️ The `STRIPE_SECRET_KEY` shown is a test key. Never commit real secret keys to a public repository.

3. Install backend dependencies (if the project uses `package.json`):

```bash
npm install
```

4. Initialize the database with tables and sample users. From the `backend/` folder run:

```bash
node models/initDB.js
```

If successful, you should see:

```
✅ Database initialized with users, applications, documents, staff actions, and payments tables.
```

5. Start the backend server (from the `backend/` folder):

```bash
node server.js
```

If successful, you should see:

```
🚀 Server running on port 5000
```

---

## Frontend setup

1. Open another terminal and `cd` into the `frontend/` folder:

```bash
cd frontend
```

2. Install frontend dependencies (if required):

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

This should start the frontend development server (Vite, CRA or similar) and print the local URL (for example `http://localhost:5173`).

---

## Test user accounts

Use these accounts for testing login and role-based views:

* **Business Owner**

  * Username: `owner@genmac.local`
  * Password: `owner123`

* **Staff Admin**

  * Username: `staff@genmac.local`
  * Password: `staff123`

* **Admin**

  * Username: `admin@genmac.local`
  * Password: `admin123`

---

## Test payment card (Stripe)

Use the following test card details when testing payments with Stripe:

* Card number: `4242 4242 4242 4242`
* Expiration: `12/34`
* CVV: `123`

---

## Troubleshooting

* **`PORT` in use**: If port `5000` is already in use, either stop the process using it or change `PORT` in `.env` and update the frontend/API base URL (if applicable).
* **Database errors**: Ensure `node models/initDB.js` ran successfully. Check the script for DB file paths and permissions.
* **Server errors**: Check `server.js` logs in the terminal for stack traces and missing environment variables.
* **Frontend can't reach backend**: Confirm backend is running and the API base URL in the frontend matches `http://localhost:5000` (or the `PORT` you set).

---

## Security notes

* Never commit `.env` or real secret keys to version control.
* The `JWT_SECRET` above is for local/testing only. Use a strong secret in production.
* The Stripe key included is a **test** key. Replace with live keys and follow Stripe security recommendations when deploying.

---

## Helpful commands quick list

```bash
# from backend/
npm install
node models/initDB.js
node server.js

# from frontend/
npm install
npm run dev
```

---

## License & attribution

Add your project license or notes here if needed.

---
