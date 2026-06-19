import { useMemo, useState } from "react";
import { useMatchData } from "./hooks/useMatchData";
import { MatchCard } from "./components/MatchCard";
import { LiveFeed } from "./components/LiveFeed";
import { StatusIndicator } from "./components/StatusIndicator";

const App = () => {
  const pageSize = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const {
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
  } = useMatchData();

  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));

  const visiblePage = Math.min(currentPage, totalPages);

  const pagedMatches = useMemo(() => {
    const start = (visiblePage - 1) * pageSize;
    return matches.slice(start, start + pageSize);
  }, [matches, visiblePage]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-5 font-sans sm:px-6 lg:px-8">

      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Spotrz</h1>
          <p className="text-sm text-gray-500">
            Real-time sports dashboard
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusIndicator status={status} />

          {wsError && (
            <span className="text-xs text-red-600 font-mono">
              WS Error: {wsError}
            </span>
          )}
        </div>
      </header>

      {/* NEW MATCHES ALERT */}
      {newMatchesCount > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border-2 border-black bg-yellow-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold text-sm">
            {newMatchesCount} new match(es) added
          </span>
          <button
            onClick={dismissNewMatches}
            className="w-full rounded-full border-2 border-black bg-white px-3 py-2 text-xs sm:w-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: MATCH LIST */}
        <div className="lg:col-span-2">

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-lg">Matches</h2>
          </div>

          {isLoading && (
            <div className="p-10 text-center border-2 border-dashed">
              Loading matches...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 border-2 border-red-500 text-red-700 mb-4">
              {error}
              <button
                onClick={reloadMatches}
                className="ml-4 underline font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {pagedMatches.map((match) => {
                  const matchId = match.id ?? match._id;

                  return (
                  <MatchCard
                    key={matchId}
                    match={match}
                    isActive={String(activeMatchId) === String(matchId)}
                    onWatch={watchMatch}
                    onUnwatch={unwatchMatch}
                  />
                  );
                })}
              </div>

              {/* PAGINATION */}
              {matches.length > pageSize && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-gray-500">
                    Page {visiblePage} of {totalPages}
                  </span>

                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      className="rounded border-2 border-black px-3 py-2 text-xs"
                    >
                      Prev
                    </button>

                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(totalPages, p + 1)
                        )
                      }
                      className="rounded border-2 border-black px-3 py-2 text-xs"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: LIVE FEED */}
        <div className="h-[70vh] min-h-[420px] lg:col-span-1 lg:h-[600px] lg:sticky lg:top-6">
          <LiveFeed
            messages={commentary}
            isActive={!!activeMatchId}
            isLoading={isCommentaryLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
