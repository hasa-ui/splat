import { distance } from "./math";
import type { StageNode } from "./definitions";
import type { TeamId, Vec2 } from "./types";

interface ScoreBotNodeCandidateParams {
  actorPos: Vec2;
  candidateIndex: number;
  reachableNodeCount: number;
  team: TeamId;
  node: StageNode;
  paintScore: number;
}

const CONTEST_NODE_MIN = 3;
const CONTEST_NODE_MAX = 5;
const SETTLED_CONTEST_THRESHOLD = 1;
const SETTLED_CONTEST_DISTANCE = 1.1;
const SETTLED_CONTEST_PENALTY = 3;

export function scoreBotNodeCandidate({
  actorPos,
  candidateIndex,
  reachableNodeCount,
  team,
  node,
  paintScore,
}: ScoreBotNodeCandidateParams): number {
  let score = paintScore + node.bias[team] * 2.8 - distance(actorPos, node.pos) * 0.18;

  const isContestNode = candidateIndex >= CONTEST_NODE_MIN && candidateIndex <= CONTEST_NODE_MAX;
  const isSettledContestNode =
    isContestNode &&
    reachableNodeCount > 1 &&
    distance(actorPos, node.pos) <= SETTLED_CONTEST_DISTANCE &&
    paintScore < SETTLED_CONTEST_THRESHOLD;

  if (isSettledContestNode) {
    score -= SETTLED_CONTEST_PENALTY;
  }

  return score;
}
