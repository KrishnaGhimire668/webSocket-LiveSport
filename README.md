# Spotrz

Real-time sports dashboard built with React, Node.js, WebSocket, and MongoDB. Spotrz shows live match scores, match commentary, connection status, and new match updates through a responsive web interface.

## Tech Stack

- **Frontend:** React, JavaScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, `ws`
- **Database:** MongoDB, Mongoose
- **Validation:** Zod

## Features

- Real-time score updates with WebSocket
- Live commentary feed per match
- Match subscribe and unsubscribe support
- Paginated match list
- Connection status indicator
- New match notifications
- REST API for matches and commentary
- MongoDB persistence
- Live match simulator for development/demo data
- Responsive UI for desktop and mobile

## Architecture

```text
React Frontend
   | REST + WebSocket
   v
Express Backend
   |        |
   |        v
   |    WebSocket Server
   v
MongoDB
```

The frontend loads initial data through REST APIs and receives live updates through `ws://localhost:5000/ws`. Users subscribe to a match, and the backend broadcasts score and commentary updates to subscribed clients.

## Project Structure

```text
.
├── backend
│   └── src
│       ├── db
│       ├── routes
│       ├── simulator
│       ├── validation
│       ├── ws
│       └── index.js
├── frontend
│   └── src
│       ├── components
│       ├── hooks
│       ├── services
│       └── App.jsx
└── README.md
```

## Setup

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/spotrz
CLIENT_ORIGIN=http://localhost:5173
LIVE_SIMULATOR_ENABLED=true
```

Run:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```


## Live Simulator

The backend includes a simulator that creates live matches when none exist, sends commentary updates every 5 seconds, and randomly updates scores.
