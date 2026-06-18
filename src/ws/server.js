import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

/*
|--------------------------------------------------------------------------
| Subscription Management
|--------------------------------------------------------------------------
*/

function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanup(socket) {
  if (!socket.subscriptions) return;

  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function send(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  const message = JSON.stringify(payload);

  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

function broadcastToAll(wss, payload) {
  const message = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/*
|--------------------------------------------------------------------------
| Message Handler
|--------------------------------------------------------------------------
*/

function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch {
    return send(socket, {
      type: "error",
      message: "Invalid JSON",
    });
  }

  const { type, matchId } = message;

  if (type === "subscribe" && matchId) {
    subscribe(matchId, socket);

    socket.subscriptions.add(matchId);

    return send(socket, {
      type: "subscribed",
      matchId,
    });
  }

  if (type === "unsubscribe" && matchId) {
    unsubscribe(matchId, socket);

    socket.subscriptions.delete(matchId);

    return send(socket, {
      type: "unsubscribed",
      matchId,
    });
  }
}

/*
|--------------------------------------------------------------------------
| WebSocket Server
|--------------------------------------------------------------------------
*/

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  // Upgrade HTTP → WS
  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname !== "/ws") return;

    // Arcjet protection (optional)
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          socket.write(
            decision.reason?.isRateLimit()
              ? "HTTP/1.1 429 Too Many Requests\r\n\r\n"
              : "HTTP/1.1 403 Forbidden\r\n\r\n"
          );
          socket.destroy();
          return;
        }
      } catch (err) {
        console.error("WS protection error:", err);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Connection
  |--------------------------------------------------------------------------
  */

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.subscriptions = new Set();

    socket.on("pong", () => (socket.isAlive = true));

    send(socket, { type: "welcome" });

    socket.on("message", (data) => handleMessage(socket, data));

    socket.on("close", () => cleanup(socket));

    socket.on("error", (err) => {
      console.error("WebSocket error:", err);
      socket.terminate();
    });
  });

  /*
  |--------------------------------------------------------------------------
  | Heartbeat (keep connection alive)
  |--------------------------------------------------------------------------
  */

  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (!socket.isAlive) return socket.terminate();

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  /*
  |--------------------------------------------------------------------------
  | Public API (used in index.js)
  |--------------------------------------------------------------------------
  */

  function broadcastMatchCreated(match) {
    broadcastToAll(wss, {
      type: "match_created",
      data: match,
    });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, {
      type: "commentary",
      data: comment,
    });
  }

  return {
    broadcastMatchCreated,
    broadcastCommentary,
  };
}