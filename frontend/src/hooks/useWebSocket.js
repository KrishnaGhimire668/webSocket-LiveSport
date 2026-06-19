import { useCallback, useEffect, useRef, useState } from "react";
import {
  WS_BASE_URL,
  INITIAL_RECONNECT_DELAY,
  MAX_RECONNECT_DELAY,
} from "../constants";

export const useWebSocket = (onMessage) => {
  const [status, setStatus] = useState("disconnected");

  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const connectTimeout = useRef(null);
  const isManualClose = useRef(false);
  const connectRef = useRef(null);

  const subscribed = useRef(new Set());

  const sendJson = useCallback((payload) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return false;

    ws.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const connect = useCallback(() => {
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
    }

    isManualClose.current = false;

    setStatus(reconnectAttempts.current ? "reconnecting" : "connecting");

    const socket = new WebSocket(WS_BASE_URL);
    ws.current = socket;

    socket.onopen = () => {
      if (ws.current !== socket) return;

      setStatus("connected");
      reconnectAttempts.current = 0;

      // restore subscriptions
      if (subscribed.current.size > 0) {
        sendJson({
          type: "setSubscriptions",
          matchIds: Array.from(subscribed.current),
        });
      }
    };

    socket.onmessage = (event) => {
      if (ws.current !== socket) return;

      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.log("WS parse error", err);
      }
    };

    socket.onerror = () => {
      if (ws.current !== socket) return;

      setStatus("error");
    };

    socket.onclose = () => {
      if (ws.current !== socket) return;

      ws.current = null;

      if (isManualClose.current) {
        setStatus("disconnected");
        return;
      }

      setStatus("disconnected");

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY *
          Math.pow(2, reconnectAttempts.current),
        MAX_RECONNECT_DELAY
      );

      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current += 1;
        connectRef.current?.();
      }, delay);
    };
  }, [onMessage, sendJson]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const connectGlobal = useCallback(() => {
    if (connectTimeout.current) return;

    if (
      ws.current &&
      (ws.current.readyState === 0 ||
        ws.current.readyState === 1)
    ) {
      return;
    }

    connectTimeout.current = setTimeout(() => {
      connectTimeout.current = null;
      connect();
    }, 0);
  }, [connect]);

  const subscribeMatch = useCallback((matchId) => {
    const subscriptionId = String(matchId);
    subscribed.current.add(subscriptionId);

    sendJson({
      type: "subscribe",
      matchId: subscriptionId,
    });
  }, [sendJson]);

  const unsubscribeMatch = useCallback((matchId) => {
    const subscriptionId = String(matchId);
    subscribed.current.delete(subscriptionId);

    sendJson({
      type: "unsubscribe",
      matchId: subscriptionId,
    });
  }, [sendJson]);

  const disconnect = useCallback(() => {
    isManualClose.current = true;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (connectTimeout.current) {
      clearTimeout(connectTimeout.current);
      connectTimeout.current = null;
    }

    ws.current?.close();
    ws.current = null;

    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => {
      isManualClose.current = true;
      if (connectTimeout.current) {
        clearTimeout(connectTimeout.current);
      }
      ws.current?.close();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  return {
    status,
    connectGlobal: connectGlobal,
    subscribeMatch,
    unsubscribeMatch,
    disconnect,
  };
};
