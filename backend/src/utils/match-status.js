import { MATCH_STATUS } from '../validation/matches.js';

//  Decide match status based on time
export function getMatchStatus(startTime, endTime, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return null;
    }

    // before start
    if (now < start) {
        return MATCH_STATUS.SCHEDULED;
    }

    // after end
    if (now >= end) {
        return MATCH_STATUS.FINISHED;
    }

    // between start and end
    return MATCH_STATUS.LIVE;
}

//  Sync match status 
export async function syncMatchStatus(match, updateStatus) {
    const nextStatus = getMatchStatus(
        match.startTime,
        match.endTime
    );

    if (!nextStatus) {
        return match.status;
    }

    if (match.status !== nextStatus) {
        await updateStatus(nextStatus);

        // document update (in-memory change)
        match.status = nextStatus;
    }

    return match.status;
}