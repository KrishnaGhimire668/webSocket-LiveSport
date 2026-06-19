import { Commentary, Match } from "../db/schema.js";

const COMMENTARY_INTERVAL_MS = 5000;
const SCORE_CHANCE = 0.18;
const MIN_ACTIVE_MATCHES = 3;
const MAX_ACTIVE_MATCHES = 5;

const TEAMS = [
  ["Kathmandu Kings", "Lalitpur Lions"],
  ["Pokhara Strikers", "Biratnagar Blazers"],
  ["Chitwan Rangers", "Butwal Warriors"],
  ["Dharan United", "Janakpur Royals"],
  ["Bhaktapur City", "Hetauda Hawks"],
];

const SCORE_EVENTS = [
  "Great goal!",
  "Clinical finish inside the box!",
  "What a strike from distance!",
  "The keeper had no chance!",
  "Brilliant team move ends in a goal!",
];

const GENERAL_EVENTS = [
  { eventType: "foul", message: "Heavy challenge in midfield. Free kick awarded." },
  { eventType: "corner", message: "Corner kick after a dangerous attack." },
  { eventType: "save", message: "Excellent save keeps the scoreline alive." },
  { eventType: "attack", message: "Fast break building down the wing." },
  { eventType: "chance", message: "Big chance, but the shot goes wide." },
  { eventType: "yellow_card", message: "Yellow card after a late tackle." },
  { eventType: "possession", message: "Patient buildup as the team looks for space." },
  { eventType: "pressure", message: "Sustained pressure around the penalty area." },
  { eventType: "substitution", message: "Fresh legs are coming on as the tempo rises." },
  { eventType: "clearance", message: "Important clearance under pressure." },
];

let simulatorState = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function liveMatchWindow() {
  const now = new Date();
  const startTime = new Date(now.getTime() - 15 * 60 * 1000);
  const endTime = new Date(now.getTime() + 90 * 60 * 1000);

  return { startTime, endTime };
}

async function seedLiveMatches({ broadcastMatchCreated }) {
  const existingLiveCount = await Match.countDocuments({ status: "live" });
  if (existingLiveCount > 0) return;

  const seededMatches = await Match.insertMany(
    TEAMS.map(([homeTeam, awayTeam]) => ({
      sport: "football",
      homeTeam,
      awayTeam,
      status: "live",
      ...liveMatchWindow(),
      homeScore: randomInt(0, 2),
      awayScore: randomInt(0, 2),
    }))
  );

  for (const match of seededMatches) {
    broadcastMatchCreated?.(match);
  }

  console.log(`Live simulator seeded ${seededMatches.length} live matches`);
}

async function pickLiveMatches() {
  const liveMatches = await Match.find({ status: "live" }).sort({ updatedAt: -1 });
  const count = randomInt(
    Math.min(MIN_ACTIVE_MATCHES, liveMatches.length),
    Math.min(MAX_ACTIVE_MATCHES, liveMatches.length)
  );

  return shuffle(liveMatches).slice(0, count);
}

async function createCommentary(match, scoringTeam, didScore) {
  const minute = randomInt(1, 90);

  if (didScore) {
    return Commentary.create({
      matchId: match._id,
      minute,
      eventType: "goal",
      team: scoringTeam,
      message: `${sample(SCORE_EVENTS)} ${scoringTeam} scores in the ${minute}' minute.`,
      tags: ["live", "simulated", "goal"],
      metadata: { simulator: true },
    });
  }

  const event = sample(GENERAL_EVENTS);

  return Commentary.create({
    matchId: match._id,
    minute,
    eventType: event.eventType,
    team: sample([match.homeTeam, match.awayTeam]),
    message: event.message,
    tags: ["live", "simulated"],
    metadata: { simulator: true },
  });
}

async function updateOneMatch(match, broadcasters) {
  const currentMatch = await Match.findOne({ _id: match._id, status: "live" });
  if (!currentMatch) return;

  const homeScores = Math.random() >= 0.5;
  const scoringTeam = homeScores ? currentMatch.homeTeam : currentMatch.awayTeam;
  const shouldScore = Math.random() < SCORE_CHANCE;

  if (shouldScore) {
    if (homeScores) {
      currentMatch.homeScore += 1;
    } else {
      currentMatch.awayScore += 1;
    }

    await currentMatch.save();

    broadcasters.broadcastScoreUpdate?.(currentMatch._id, {
      homeScore: currentMatch.homeScore,
      awayScore: currentMatch.awayScore,
    });
  }

  const commentary = await createCommentary(currentMatch, scoringTeam, shouldScore);
  broadcasters.broadcastCommentary?.(currentMatch._id, commentary);
}

async function runTick(state) {
  if (state.isRunning || state.isStopped) return;

  state.isRunning = true;

  try {
    let liveMatches = await pickLiveMatches();
    if (liveMatches.length === 0) {
      await seedLiveMatches(state.broadcasters);
      liveMatches = await pickLiveMatches();
    }

    if (liveMatches.length === 0) return;

    const updatesThisTick = randomInt(
      Math.min(MIN_ACTIVE_MATCHES, liveMatches.length),
      Math.min(MAX_ACTIVE_MATCHES, liveMatches.length)
    );
    const selectedMatches = shuffle(liveMatches).slice(0, updatesThisTick);

    for (const match of selectedMatches) {
      await updateOneMatch(match, state.broadcasters);
    }
  } catch (error) {
    console.error("Live simulator tick failed:", error);
  } finally {
    state.isRunning = false;
  }
}

function scheduleNextTick(state) {
  if (state.isStopped) return;

  state.timeoutId = setTimeout(async () => {
    await runTick(state);
    scheduleNextTick(state);
  }, COMMENTARY_INTERVAL_MS);
}

export async function startLiveMatchSimulator(broadcasters = {}) {
  if (simulatorState && !simulatorState.isStopped) {
    return simulatorState.stop;
  }

  await seedLiveMatches(broadcasters);

  simulatorState = {
    broadcasters,
    isRunning: false,
    isStopped: false,
    timeoutId: null,
    stop() {
      simulatorState.isStopped = true;

      if (simulatorState.timeoutId) {
        clearTimeout(simulatorState.timeoutId);
        simulatorState.timeoutId = null;
      }
    },
  };

  scheduleNextTick(simulatorState);

  console.log("Live match simulator started");

  return simulatorState.stop;
}
