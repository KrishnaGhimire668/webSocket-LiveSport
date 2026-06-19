import React, { useEffect, useRef, useState } from "react";

export const MatchCard = ({
  match,
  isActive,
  onWatch,
  onUnwatch,
}) => {
  const isLive = match.status?.toLowerCase() === "live";

  const [homePulse, setHomePulse] = useState(false);
  const [awayPulse, setAwayPulse] = useState(false);

  const prevScore = useRef({
    home: match.homeScore,
    away: match.awayScore,
  });

  useEffect(() => {
    const prev = prevScore.current;

    if (prev.home !== match.homeScore) {
      setHomePulse(true);
      setTimeout(() => setHomePulse(false), 800);
    }

    if (prev.away !== match.awayScore) {
      setAwayPulse(true);
      setTimeout(() => setAwayPulse(false), 800);
    }

    prevScore.current = {
      home: match.homeScore,
      away: match.awayScore,
    };
  }, [match.homeScore, match.awayScore]);

  const actionLabel = () => {
    if (isLive) {
      return isActive ? "Watching Live" : "Watch Live";
    }

    if (match.status === "finished") {
      return isActive ? "Viewing Recap" : "View Recap";
    }

    return isActive ? "Viewing Match" : "View Match";
  };

  return (
    <div
      className={`
        p-5 border-2 border-black rounded-2xl bg-white
        transition-all duration-200
        ${isActive ? "shadow-lg ring-2 ring-yellow-400" : ""}
      `}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-bold uppercase">
          {match.sport}
        </span>

        <span
          className={`text-xs font-bold ${
            isLive ? "text-red-500" : "text-gray-500"
          }`}
        >
          {match.status}
        </span>
      </div>

      {/* TEAMS */}
      <div className="space-y-3 mb-5">
        {/* HOME */}
        <div className="flex justify-between items-center">
          <span className="font-bold">{match.homeTeam}</span>
          <span
            className={`px-3 py-1 border-2 border-black rounded-lg min-w-[50px] text-center ${
              homePulse ? "bg-yellow-300" : "bg-gray-100"
            }`}
          >
            {match.homeScore}
          </span>
        </div>

        {/* AWAY */}
        <div className="flex justify-between items-center">
          <span className="font-bold">{match.awayTeam}</span>
          <span
            className={`px-3 py-1 border-2 border-black rounded-lg min-w-[50px] text-center ${
              awayPulse ? "bg-yellow-300" : "bg-gray-100"
            }`}
          >
            {match.awayScore}
          </span>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center border-t pt-4">
        <span className="text-xs text-gray-500">
          {new Date(match.startTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        <div className="flex gap-2">
          <button
            onClick={() => onWatch(match.id)}
            disabled={isActive}
            className={`
              px-4 py-2 text-sm font-bold border-2 border-black rounded-full
              transition-all
              ${
                isActive
                  ? "bg-blue-400 cursor-default"
                  : "bg-yellow-400 hover:bg-yellow-300"
              }
            `}
          >
            {actionLabel()}
          </button>

          {isActive && (
            <button
              onClick={() => onUnwatch(match.id)}
              className="px-3 py-2 text-xs font-bold border-2 border-black rounded-full bg-white hover:bg-gray-100"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};