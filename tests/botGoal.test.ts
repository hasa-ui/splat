import { describe, expect, it } from "vitest";
import { DEFAULT_STAGE_ID, getStageDefinition } from "../src/game/definitions";
import { scoreBotNodeCandidate } from "../src/game/botGoal";

describe("scoreBotNodeCandidate", () => {
  const stage = getStageDefinition(DEFAULT_STAGE_ID);

  it("penalizes lingering on a settled contest node when another path is available", () => {
    const actorPos = stage.navigationNodes[5].pos;
    const stayScore = scoreBotNodeCandidate({
      actorPos,
      candidateIndex: 5,
      reachableNodeCount: 2,
      team: 0,
      node: stage.navigationNodes[5],
      paintScore: 0,
    });
    const moveScore = scoreBotNodeCandidate({
      actorPos,
      candidateIndex: 7,
      reachableNodeCount: 2,
      team: 0,
      node: stage.navigationNodes[7],
      paintScore: 0,
    });

    expect(moveScore).toBeGreaterThan(stayScore);
  });

  it("keeps a contest node attractive while it still needs repainting", () => {
    const actorPos = stage.navigationNodes[5].pos;
    const stayScore = scoreBotNodeCandidate({
      actorPos,
      candidateIndex: 5,
      reachableNodeCount: 2,
      team: 0,
      node: stage.navigationNodes[5],
      paintScore: 3.5,
    });
    const moveScore = scoreBotNodeCandidate({
      actorPos,
      candidateIndex: 7,
      reachableNodeCount: 2,
      team: 0,
      node: stage.navigationNodes[7],
      paintScore: 0,
    });

    expect(stayScore).toBeGreaterThan(moveScore);
  });

  it("keeps the penalty active after the bot has already retargeted away", () => {
    const actorPos = { x: 2.4, y: 3.6 };
    const returnScore = scoreBotNodeCandidate({
      actorPos,
      candidateIndex: 5,
      reachableNodeCount: 2,
      team: 0,
      node: stage.navigationNodes[5],
      paintScore: 0,
    });
    const continueScore = scoreBotNodeCandidate({
      actorPos,
      candidateIndex: 7,
      reachableNodeCount: 2,
      team: 0,
      node: stage.navigationNodes[7],
      paintScore: 0,
    });

    expect(continueScore).toBeGreaterThan(returnScore);
  });
});
