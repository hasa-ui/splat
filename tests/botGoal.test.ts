import { describe, expect, it } from "vitest";
import { scoreBotNodeCandidate } from "../src/game/botGoal";
import { stageNodes } from "../src/game/stage";

describe("scoreBotNodeCandidate", () => {
  it("penalizes lingering on a settled contest node when another path is available", () => {
    const actorPos = stageNodes[5].pos;
    const stayScore = scoreBotNodeCandidate({
      actorPos,
      currentTargetNode: 5,
      candidateIndex: 5,
      reachableNodeCount: 2,
      team: 0,
      node: stageNodes[5],
      paintScore: 0,
    });
    const moveScore = scoreBotNodeCandidate({
      actorPos,
      currentTargetNode: 5,
      candidateIndex: 7,
      reachableNodeCount: 2,
      team: 0,
      node: stageNodes[7],
      paintScore: 0,
    });

    expect(moveScore).toBeGreaterThan(stayScore);
  });

  it("keeps a contest node attractive while it still needs repainting", () => {
    const actorPos = stageNodes[5].pos;
    const stayScore = scoreBotNodeCandidate({
      actorPos,
      currentTargetNode: 5,
      candidateIndex: 5,
      reachableNodeCount: 2,
      team: 0,
      node: stageNodes[5],
      paintScore: 3.5,
    });
    const moveScore = scoreBotNodeCandidate({
      actorPos,
      currentTargetNode: 5,
      candidateIndex: 7,
      reachableNodeCount: 2,
      team: 0,
      node: stageNodes[7],
      paintScore: 0,
    });

    expect(stayScore).toBeGreaterThan(moveScore);
  });
});
