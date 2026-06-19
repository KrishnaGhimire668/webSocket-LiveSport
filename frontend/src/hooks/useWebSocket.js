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
  const isManualClose = useRef(false);

  const subscribed = useRef(new Set());

  const connect = useCallback(() => {
    if (ws.current) {
      isManualClose.current = true;
      ws.current.close();
    }

    isManualClose.current = false;

    setStatus(reconnectAttempts.current ? "reconnecting" : "connecting");

    const socket = new WebSocket(WS_BASE_URL);
    ws.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      reconnectAttempts.current = 0;

      // restore subscriptions
      if (subscribed.current.size > 0) {
        socket.send(
          JSON.stringify({
            type: "setSubscriptions",
            matchIds: Array.from(subscribed.current),
          })
        );
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.log("WS parse error", err);
      }
    };

    socket.onerror = () => {
      setStatus("error");
    };

    socket.onclose = () => {
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
        connect();
      }, delay);
    };
  }, [onMessage]);

  const connectGlobal = useCallback(() => {
    if (
      ws.current &&
      (ws.current.readyState === 0 ||
        ws.current.readyState === 1)
    ) {
      return;
    }

    connect();
  }, [connect]);

  const subscribeMatch = useCallback((matchId) => {
    subscribed.current.add(String(matchId));

    ws.current?.send(
      JSON.stringify({
        type: "subscribe",
        matchId,
      })
    );
  }, []);

  const unsubscribeMatch = useCallback((matchId) => {
    subscribed.current.delete(String(matchId));

    ws.current?.send(
      JSON.stringify({
        type: "unsubscribe",
        matchId,
      })
    );
  }, []);

  const disconnect = useCallback(() => {
    isManualClose.current = true;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    ws.current?.close();
    ws.current = null;

    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => {
      isManualClose.current = true;
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