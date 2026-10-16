# Personal AI Assistant

An open-source, cost-free Personal AI Assistant mobile application built with **React Native (Expo)**, **Node.js + Express**, **Google Gemini API (Free Tier)**, and **MongoDB Atlas (Free Tier)**.

## Project Structure

```text
personal-ai-assistant/
├── docs/       # Architecture, designs, and learning guides
├── mobile/     # React Native Expo mobile frontend
└── backend/    # Node.js + Express REST API backend
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher; currently running v22.17.0)
- npm (v10 or higher)
- [Expo Go](https://expo.dev/go) app on your mobile phone (available on Google Play Store & Apple App Store)

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

The backend server will start on `http://localhost:5000`. You can test it by visiting:
- Health check: `http://localhost:5000/api/health`

### 2. Start the Mobile App

```bash
cd mobile
npm install
npx expo start
```

Press `w` in the terminal to open the web preview, or scan the displayed QR code with the **Expo Go** app on your physical iOS/Android phone.

## Security Notice

- All API keys (such as `GEMINI_API_KEY`) and database credentials (`MONGODB_URI`) are stored **only** on the backend inside `backend/.env`.
- The `.env` file is excluded from git version control via `.gitignore`.
- The mobile app will never store or expose secret keys.
