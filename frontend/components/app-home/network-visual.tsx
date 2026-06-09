"use client";

/** Minimal abstract network — no labels, calm motion. */

const NODES: { x: number; y: number; pulse?: boolean; delay?: string }[] = [
  { x: 200, y: 128, pulse: true },
  { x: 128, y: 88, pulse: true, delay: "app-network-pulse-delay-1" },
  { x: 272, y: 92 },
  { x: 88, y: 148 },
  { x: 312, y: 140, pulse: true, delay: "app-network-pulse-delay-2" },
  { x: 156, y: 188 },
  { x: 244, y: 176 },
  { x: 108, y: 108 },
  { x: 292, y: 168 },
  { x: 176, y: 108 },
  { x: 228, y: 208 },
];

const UNIQUE_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 6],
  [0, 9],
  [1, 7],
  [1, 9],
  [2, 4],
  [3, 1],
  [3, 5],
  [4, 6],
  [4, 8],
  [5, 6],
  [5, 10],
  [6, 10],
  [7, 3],
  [8, 4],
  [9, 1],
];

/** Primary routing path for flow animation (node indices). */
const FLOW_PATH = [3, 1, 0, 2, 4, 8];

function pathD(indices: number[]): string {
  const pts = indices.map((i) => NODES[i]);
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export function NetworkVisual({ className }: { className?: string }) {
  const flowD = pathD(FLOW_PATH);

  return (
    <div
      className={className}
      aria-hidden
      role="presentation"
    >
      <svg
        viewBox="0 0 400 256"
        className="mx-auto h-auto w-full max-w-lg text-primary/30"
        fill="none"
      >
        <defs>
          <linearGradient id="app-edge-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {UNIQUE_EDGES.map(([a, b], i) => {
          const n1 = NODES[a];
          const n2 = NODES[b];
          return (
            <line
              key={`edge-${i}`}
              x1={n1.x}
              y1={n1.y}
              x2={n2.x}
              y2={n2.y}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={0.75}
            />
          );
        })}

        <path
          d={flowD}
          stroke="hsl(var(--primary))"
          strokeOpacity={0.45}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 18"
          className="app-network-flow"
          fill="none"
        />

        {NODES.map((node, i) => (
          <circle
            key={i}
            cx={node.x}
            cy={node.y}
            r={node.pulse ? 4 : 3}
            className={
              node.pulse
                ? `fill-primary app-network-pulse ${node.delay ?? ""}`
                : "fill-foreground/25"
            }
          />
        ))}

        <circle
          cx={NODES[0].x}
          cy={NODES[0].y}
          r={14}
          className="fill-primary/5 stroke-primary/20"
          strokeWidth={0.5}
        />
      </svg>
    </div>
  );
}
