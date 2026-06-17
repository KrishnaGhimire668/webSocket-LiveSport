import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
    sport: String,
    homeTeam: String,
    awayTeam: String,
    status: {
        type: String,
        enum: ["scheduled", "live", "finished"],
        default: "scheduled",
    },
    startTime: Date,
    endTime: Date,
    homeScore: {
        type: Number,
        default: 0,
    },
    awayScore: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

const commentarySchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
        required: true,
    },
    minute: Number,
    sequence: Number,
    period: String,
    eventType: String,
    actor: String,
    team: String,
    message: {
        type: String,
        required: true,
    },
    metadata: Object,
    tags: [String],
}, {
    timestamps: true,
});

export const Match = mongoose.model(
    "Match",
    matchSchema
);

export const Commentary = mongoose.model(
    "Commentary",
    commentarySchema
);