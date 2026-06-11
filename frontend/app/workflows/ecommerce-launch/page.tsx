import { GoalCoordinationDemo } from "@/components/workflows/goal-coordination-demo";

export const metadata = {
  title: "Goal Execution — Gleam",
  description:
    "Gleam receives a goal, discovers capabilities and providers, coordinates specialized agents, and produces an outcome",
};

export default function GoalCoordinationPage() {
  return <GoalCoordinationDemo />;
}
