import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMatches, fetchMatchCommentary } from "../services/api";
import { useWebSocket } from "./useWebSocket";

export const useMatchData = () => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentary, setCommentary] = useState([]);
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);

  const [activeMatchId, setActiveMatchId] = useState(null);
  const [wsError, setWsError] = useState(null);

  const latestMatchIdRef = useRef(null);
  const subscribedRef = useRef(new Set());

  const handleWSMessage = useCallback((msg) => {
    switch (msg.type) {
      case "score_update":
        setMatches((prev) =>
          prev.map((m) => {
            if (String(m.id) === String(msg.matchId)) {
              return {
                ...m,
                homeScore: msg.data.homeScore,
                awayScore: msg.data.awayScore,
              };
            }
            return m;
          })
        );
        break;

      case "commentary":
        if (latestMatchIdRef.current !== msg.data.matchId) return;

        setCommentary((prev) => [msg.data, ...prev]);
        break;

      case "error":
        setWsError(msg.message);
        break;

      default:
        break;
    }
  }, []);

  const {
    status,
    connectGlobal,
    subscribeMatch,
    unsubscribeMatch,
  } = useWebSocket(handleWSMessage);

  // Load matches from REST API
  const loadMatches = useCallback(async () => {
    try {
      setError(null);

      const res = await fetchMatches(100);
      const data = res.data || [];

      setMatches(data);
    } catch (err) {
      setError(err.message || "Failed to load matches");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    connectGlobal();
  }, [connectGlobal]);

  // Watch match (IMPORTANT)
  const watchMatch = useCallback(
    async (id) => {
      setActiveMatchId(id);
      latestMatchIdRef.current = id;

      setCommentary([]);
      setIsCommentaryLoading(true);

      subscribeMatch(id);

      try {
        const res = await fetchMatchCommentary(id);
        setCommentary(res.data || []);
      } catch {
        setCommentary([]);
      } finally {
        setIsCommentaryLoading(false);
      }
    },
    [subscribeMatch]
  );

  // Unwatch match
  const unwatchMatch = useCallback(
    (id) => {
      unsubscribeMatch(id);

      if (activeMatchId === id) {
        setActiveMatchId(null);
        latestMatchIdRef.current = null;
        setCommentary([]);
      }
    },
    [activeMatchId, unsubscribeMatch]
  );

  const reloadMatches = useCallback(() => {
    setIsLoading(true);
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    isLoading,
    error,

    commentary,
    isCommentaryLoading,

    wsError,
    status,

    activeMatchId,

    watchMatch,
    unwatchMatch,
    reloadMatches,
  };
};