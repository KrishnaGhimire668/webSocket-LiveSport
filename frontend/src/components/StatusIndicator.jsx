import React from "react";

export const StatusIndicator = ({ status }) => {
  const getConfig = () => {
    switch (status) {
      case "connected":
        return { color: "bg-green-500", text: "Live Connected" };

      case "connecting":
        return { color: "bg-yellow-400", text: "Connecting..." };

      case "reconnecting":
        return { color: "bg-orange-400", text: "Reconnecting..." };

      case "error":
        return { color: "bg-red-500", text: "Connection Error" };

      default:
        return { color: "bg-gray-400", text: "Offline" };
    }
  };

  const config = getConfig();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-sm">
      <div
        className={`w-3 h-3 rounded-full border border-black ${config.color}`}
      />
      <span className="text-xs font-bold uppercase tracking-wide">
        {config.text}
      </span>
    </div>
  );
};