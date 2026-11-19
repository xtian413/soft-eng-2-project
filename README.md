# Gemi

## About the Project

Gemi is a fitness and wellness mobile application designed to help users manage their daily health and training activities in one place. Users can record workouts, track meals and nutrition, monitor body weight and progress, and review their history over time.

The app brings these records together to help users understand their habits and make more informed decisions about their fitness goals. It also provides AI-generated insights based on the user's workout, diet, and progress data. The AI service is designed to run locally through Ollama so that personal fitness data does not need to be sent to a third-party AI provider.

Gemi uses a mobile frontend for the user experience, an Express API for backend functionality, and Supabase for authentication and data storage. The project is intended to provide a simple, organized way to maintain fitness records and follow progress consistently.

## Features

- Track workouts and exercise progress
- Log meals and nutrition information
- Record body weight and progress history
- View fitness data and trends
- Generate personalized fitness insights
- Use the app on Android, iOS, or the web through Expo

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
