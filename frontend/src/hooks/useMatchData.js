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
  const [newMatchesCount, setNewMatchesCount] = useState(0);

  const latestMatchIdRef = useRef(null);
  const handleWSMessage = useCallback((msg) => {
    switch (msg.type) {
      case "welcome":
      case "subscribed":
      case "unsubscribed":
        setWsError(null);
        break;

      case "match_created":
        setMatches((prev) => [msg.data, ...prev]);
        setNewMatchesCount((count) => count + 1);
        break;

      case "score_update":
        setMatches((prev) =>
          prev.map((m) => {
            if (String(m.id ?? m._id) === String(msg.matchId)) {
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
        if (String(latestMatchIdRef.current) !== String(msg.data.matchId)) return;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    connectGlobal();
  }, [connectGlobal]);

  // Watch match (IMPORTANT)
  const watchMatch = useCallback(
    async (id) => {
      const matchId = String(id);

      setActiveMatchId(matchId);
      latestMatchIdRef.current = matchId;

      setCommentary([]);
      setIsCommentaryLoading(true);

      subscribeMatch(matchId);

      try {
        const res = await fetchMatchCommentary(matchId);
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
      const matchId = String(id);

      unsubscribeMatch(matchId);

      if (String(activeMatchId) === matchId) {
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

  const dismissNewMatches = useCallback(() => {
    setNewMatchesCount(0);
  }, []);

  return {
    matches,
    isLoading,
    error,

    commentary,
    isCommentaryLoading,

    wsError,
    status,

    activeMatchId,

    newMatchesCount,
    dismissNewMatches,

    watchMatch,
    unwatchMatch,
    reloadMatches,
  };
};
