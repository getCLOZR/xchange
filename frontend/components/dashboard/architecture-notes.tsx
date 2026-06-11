import { Info } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ArchitectureNotes() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Info className="h-4 w-4" />
          Architecture
        </CardTitle>
        <CardDescription>Exchange layer scope</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>
          Gleam is domain-agnostic orchestration infrastructure for
          AI agents.
        </p>
        <p>
          The exchange understands agents, capabilities, sessions,
          orchestration, routing, and logs—not vertical business domains.
        </p>
        <ul className="list-disc list-inside text-xs font-mono space-y-1 pt-1">
          <li>Agents register and advertise capabilities</li>
          <li>Discovery routes tasks by capability name</li>
          <li>Sessions and dispatch run live via POST /sessions/dispatch</li>
          <li>Commerce and other verticals sit outside the core</li>
        </ul>
      </CardContent>
    </Card>
  );
}
