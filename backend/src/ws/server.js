import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

// ---------------- SUBSCRIPTION ----------------

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

// ---------------- HELPERS ----------------

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

// ---------------- MESSAGE HANDLER ----------------

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

  if (type === "setSubscriptions" && Array.isArray(message.matchIds)) {
    if (!socket.subscriptions) socket.subscriptions = new Set();

    for (const id of message.matchIds) {
      const subscriptionId = String(id);
      subscribe(subscriptionId, socket);
      socket.subscriptions.add(subscriptionId);
    }

    return send(socket, {
      type: "subscribed",
      matchIds: Array.from(socket.subscriptions),
    });
  }

  if (type === "subscribe" && matchId) {
    if (!socket.subscriptions) socket.subscriptions = new Set();

    const subscriptionId = String(matchId);
    subscribe(subscriptionId, socket);
    socket.subscriptions.add(subscriptionId);

    return send(socket, {
      type: "subscribed",
      matchId: subscriptionId,
    });
  }

  if (type === "unsubscribe" && matchId) {
    if (!socket.subscriptions) socket.subscriptions = new Set();

    const subscriptionId = String(matchId);
    unsubscribe(subscriptionId, socket);
    socket.subscriptions.delete(subscriptionId);

    return send(socket, {
      type: "unsubscribed",
      matchId: subscriptionId,
    });
  }

  return send(socket, {
    type: "error",
    message: `Unknown message type: ${type || "missing"}`,
  });
}

// ---------------- MAIN WS SERVER ----------------

export function attachWebSocketServer(server, options = {}) {
  const allowedOrigins = (options.allowedOrigins || []).map(o =>
    o?.replace(/\/$/, "")
  );

  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
    perMessageDeflate: false,
    maxPayload: 1024 * 1024,
  });

  // ---------------- UPGRADE HANDLER ----------------

  server.on("upgrade", async (req, socket, head) => {
    try {
      const url = req.url || "";

      if (!url.startsWith("/ws")) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      const origin = req.headers.origin?.replace(/\/$/, "");

      if (
        origin &&
        allowedOrigins.length > 0 &&
        !allowedOrigins.includes(origin)
      ) {
        console.log("❌ Blocked WS origin:", origin);
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      // Arcjet protection
      if (wsArcjet) {
        try {
          const decision = await wsArcjet.protect(req);

          if (decision.isDenied()) {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            socket.destroy();
            return;
          }
        } catch (err) {
          console.error("WS Arcjet error:", err);
          socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });

    } catch (err) {
      console.error("WS upgrade error:", err);
      socket.destroy();
    }
  });

  // ---------------- CONNECTION ----------------

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

  // ---------------- HEARTBEAT ----------------

  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (!socket.isAlive) return socket.terminate();

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  // ---------------- BROADCAST API ----------------

  function broadcastMatchCreated(match) {
    broadcastToAll(wss, {
      type: "match_created",
      data: match,
    });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(String(matchId), {
      type: "commentary",
      data: comment,
    });
  }

  function broadcastScoreUpdate(matchId, score) {
    broadcastToMatch(String(matchId), {
      type: "score_update",
      matchId: String(matchId),
      data: score,
    });
  }

  return {
    broadcastMatchCreated,
    broadcastCommentary,
    broadcastScoreUpdate,
  };
}