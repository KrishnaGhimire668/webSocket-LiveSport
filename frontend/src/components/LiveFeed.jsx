export const LiveFeed = ({ messages, isActive, isLoading }) => {
  if (!isActive) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-black bg-gray-50 p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-black bg-yellow-400">
          <span className="text-xl">📡</span>
        </div>

        <h3 className="font-bold text-lg mb-2">No Match Selected</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Select a match to view live commentary and real-time updates.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border-2 border-black bg-white">
      
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-black bg-blue-500 p-3 text-white">
        <h3 className="font-bold">Live Commentary</h3>
        <span className="text-xs bg-white text-black px-2 py-1 rounded border border-black">
          LIVE
        </span>
      </div>

      {/* FEED */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">
            Loading commentary...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            Waiting for live updates...
          </div>
        ) : (
          messages.map((msg) => {
            const messageId = msg.id ?? msg._id ?? `${msg.matchId}-${msg.sequence ?? msg.createdAt}`;

            return (
            <div key={messageId} className="flex gap-3">
              
              {/* DOT */}
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-yellow-400 border border-black rounded-full"></div>
                <div className="w-px flex-1 bg-gray-200"></div>
              </div>

              {/* CONTENT */}
              <div className="min-w-0 pb-4">
                
                {/* META */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-1">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>

                  {msg.minute && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded border">
                      {msg.minute}'
                    </span>
                  )}

                  {msg.eventType && (
                    <span className="bg-yellow-400 px-2 py-0.5 rounded border border-black uppercase text-[10px] font-bold">
                      {msg.eventType}
                    </span>
                  )}
                </div>

                {/* ACTOR */}
                {(msg.actor || msg.team) && (
                  <div className="mb-1 text-xs font-semibold text-gray-700">
                    {msg.actor} {msg.team ? `• ${msg.team}` : ""}
                  </div>
                )}

                {/* MESSAGE */}
                <div className="break-words rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  {msg.message}
                </div>

                {/* TAGS */}
                {msg.tags?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {msg.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 border border-gray-300 rounded-full uppercase text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
