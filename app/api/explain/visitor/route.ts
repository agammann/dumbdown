import { visitorExplanation } from "../../../../lib/visitor-explanation.mjs";

export async function POST(request: Request) {
  return visitorExplanation(request);
}
