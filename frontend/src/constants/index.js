const DEFAULT_API_BASE_URL =
  "https://websocket-livesport.onrender.com";

const DEFAULT_WS_BASE_URL =
  "wss://websocket-livesport.onrender.com/ws";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE_URL;

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  DEFAULT_WS_BASE_URL;

export const INITIAL_RECONNECT_DELAY = 1000;

export const MAX_RECONNECT_DELAY = 30000;