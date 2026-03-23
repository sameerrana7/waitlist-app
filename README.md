# 🍽️ La Maison — Waitlist Management App

A production-grade restaurant waitlist system built with **React + Node.js + Firebase**.

---

## 📁 Project Structure

```
waitlist-app/
├── frontend/        → React.js app (customer + manager UI)
├── backend/         → Node.js + Express API
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- npm or yarn
- Firebase project (already set up)

---

### 1. Clone / Download this project

```bash
git clone https://github.com/sameerrana7/Test-app.git
cd waitlist-app
```

---

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Now fill in your `.env` file. You need a **Firebase Service Account Key**:

1. Go to Firebase Console → Project Settings → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. Copy values from JSON into your `.env`:

```env
FIREBASE_PROJECT_ID=test-app-49363
FIREBASE_DATABASE_URL=https://test-app-49363-default-rtdb.firebaseio.com
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@test-app-49363.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR KEY HERE\n-----END PRIVATE KEY-----\n"
JWT_SECRET=make_this_a_long_random_string_at_least_32_chars
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev
# API running at http://localhost:5000
```

---

### 3. Setup Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
```

Fill in `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_FIREBASE_API_KEY=AIzaSyAFNI4aFSPf_efB-W0QCHKv5GqdC3RdYf8
REACT_APP_FIREBASE_AUTH_DOMAIN=test-app-49363.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://test-app-49363-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=test-app-49363
REACT_APP_BRANCH_ID=       ← fill this after registering (step 4)
```

Start frontend:
```bash
npm start
# App running at http://localhost:3000
```

---

### 4. Register your Manager Account

1. Open `http://localhost:3000/login`
2. Click **"Register"**
3. Fill in your name, restaurant name, email, password
4. After registering, open browser console (F12) → check `localStorage` for `user`
5. Copy the `branchId` value
6. Paste it into `REACT_APP_BRANCH_ID` in your frontend `.env`
7. Restart frontend: `npm start`

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register manager |
| POST | `/api/auth/login` | No | Login manager |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/queue/join` | No | Customer joins queue |
| GET | `/api/queue/:branchId` | JWT | Get full queue |
| GET | `/api/queue/:branchId/status` | No | Public wait status |
| PATCH | `/api/queue/:branchId/:id/call` | JWT | Call customer |
| PATCH | `/api/queue/:branchId/:id/seat` | JWT | Seat customer |
| PATCH | `/api/queue/:branchId/:id/skip` | JWT | Skip customer |
| DELETE | `/api/queue/:branchId/:id` | JWT | Remove customer |
| DELETE | `/api/queue/:branchId/reset/all` | JWT | Reset day |

---

## 🌐 App Routes

| URL | Who sees it | Description |
|-----|-------------|-------------|
| `/` | Customers | Check-in page (QR code points here) |
| `/login` | Manager | Login / Register |
| `/manager` | Manager only | Dashboard (protected) |

---

## 🚢 Deployment

### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → New Project
2. Connect your GitHub repo
3. Select the `backend` folder
4. Add all environment variables from `.env`
5. Deploy → copy the public URL

### Deploy Frontend to Vercel (free)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variables:
   - `REACT_APP_API_URL` = your Railway backend URL + `/api`
   - All other `REACT_APP_FIREBASE_*` vars
5. Deploy → you get a `*.vercel.app` URL

### Update CORS in Backend

After deploying frontend, update `FRONTEND_URL` in Railway env vars to your Vercel URL.

---

## 🔒 Security Features

- JWT authentication for managers
- Rate limiting (100 req/15min global, 10 check-ins/hour per IP)
- Helmet.js security headers
- CORS restricted to your domain
- Input validation on all endpoints
- Role-based access control

---

## 📱 QR Code

Point your QR code to: `https://your-frontend-url.vercel.app/`

Use any free QR generator like [qr-code-generator.com](https://www.qr-code-generator.com)
