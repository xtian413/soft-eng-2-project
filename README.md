# Gemi

Gemi is a fitness app for tracking workouts, meals, body progress, and AI-generated insights.

## Stack

- **Frontend:** React Native with Expo
- **Backend:** Node.js, Express, and TypeScript
- **Database:** Supabase
- **AI:** Local Ollama service

## Setup

1. Install Node.js 20 or later.
2. Install dependencies:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Create environment files:
   - `backend/.env`
   - `frontend/.env`

   Use the variables described in `frontend/DEVELOPER_SETUP.md`.

## Run

Start the backend:

```bash
cd backend
npm run dev
```

Start the Expo app in another terminal:

```bash
cd frontend
npm run start
```

Use the Expo CLI to open the app on Android, iOS, or the web.

## Project Structure

- `frontend/` - Expo React Native application
- `backend/` - Express API
- `supabase/` - Database configuration and migrations
