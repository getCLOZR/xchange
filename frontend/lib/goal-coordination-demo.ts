import {
  checkAllAgentsHealth,
  getAgents,
  getCapabilities,
  getHealth,
  registerAgent,
} from "@/lib/api";
import {
  AGENT_REGISTER_PRESETS,
  type AgentRegisterPreset,
} from "@/lib/developer-presets";
import type {
  AgentRegisterRequest,
  CapabilityGroup,
  EcommerceLaunchRequest,
  EcommerceLaunchResponse,
  WorkerEndpointMode,
} from "@/types";

/** Capabilities required for the goal coordination demo (maps to existing workflow). */
const GOAL_DEMO_WORKER_PRESET_IDS = [
  "product-research",
  "seo-keywords",
  "product-copy",
  "marketing-copy",
] as const;

const GLEAM_REQUESTER_NAME = "Gleam";

export const PLANNED_CAPABILITIES = [
  {
    name: "product_research",
    label: "Product research",
    agentLabel: "Product Research Agent",
  },
  {
    name: "seo_keywords",
    label: "SEO keywords",
    agentLabel: "SEO Keyword Agent",
  },
  {
    name: "product_copy",
    label: "Product copy",
    agentLabel: "Product Copy Agent",
  },
  {
    name: "marketing_copy",
    label: "Marketing copy",
    agentLabel: "Marketing Copy Agent",
  },
] as const;

export interface DiscoveredProvider {
  capability: string;
  capabilityLabel: string;
  agentName: string | null;
  agentId: number | null;
  healthy: boolean;
}

export interface ProviderCandidate {
  name: string;
  selected: boolean;
  healthy: boolean;
  matchPercent: number;
  avgLatencySec: number;
  agentId: number | null;
}

export interface CapabilityProviderDiscovery {
  capability: string;
  candidates: ProviderCandidate[];
}

export interface SelectionReason {
  capability: string;
  agentName: string;
  reason: string;
}

export interface CoordinationHandoff {
  from: string;
  payload: string;
  to: string;
}

export interface NetworkRoutingSummary {
  capabilitiesRecognized: number;
  providersSelected: number;
  agentExecutions: number;
  handoffs: number;
  outcomesGenerated: number;
  workflowId: string | null;
}

/** Deterministic network candidates for demo discovery UI. */
const DEMO_CANDIDATE_POOL: Record<
  string,
  { name: string; matchPercent: number; avgLatencySec: number }[]
> = {
  product_research: [
    { name: "Product Research Agent", matchPercent: 96, avgLatencySec: 1.2 },
    { name: "Commerce Intel Agent", matchPercent: 84, avgLatencySec: 1.5 },
    { name: "Catalog Research Agent", matchPercent: 78, avgLatencySec: 1.7 },
  ],
  seo_keywords: [
    { name: "SEO Keyword Agent", matchPercent: 95, avgLatencySec: 0.9 },
    { name: "Search Intent Agent", matchPercent: 86, avgLatencySec: 1.1 },
    { name: "Keyword Cluster Agent", matchPercent: 80, avgLatencySec: 1.3 },
  ],
  product_copy: [
    { name: "Product Copy Agent", matchPercent: 94, avgLatencySec: 1.0 },
    { name: "PDP Copy Agent", matchPercent: 85, avgLatencySec: 1.2 },
    { name: "Conversion Copy Agent", matchPercent: 79, avgLatencySec: 1.4 },
  ],
  marketing_copy: [
    { name: "Marketing Copy Agent", matchPercent: 93, avgLatencySec: 1.1 },
    { name: "Paid Social Copy Agent", matchPercent: 87, avgLatencySec: 1.0 },
    { name: "Email Launch Agent", matchPercent: 81, avgLatencySec: 1.3 },
  ],
};

export const COORDINATION_HANDOFFS: CoordinationHandoff[] = [
  {
    from: "Product Research Agent",
    payload: "research_context",
    to: "SEO Keyword Agent",
  },
  {
    from: "SEO Keyword Agent",
    payload: "keyword_strategy",
    to: "Product Copy Agent",
  },
  {
    from: "Product Copy Agent",
    payload: "product_positioning",
    to: "Marketing Copy Agent",
  },
];

function presetToRegisterRequest(
  preset: AgentRegisterPreset,
  mode: WorkerEndpointMode
): AgentRegisterRequest {
  return {
    name: preset.name,
    description: preset.description,
    endpoint_url:
      mode === "docker"
        ? preset.endpoint_url_docker
        : preset.endpoint_url_local,
    owner_name: preset.owner_name,
    version: preset.version,
    cost_credits: preset.cost_credits,
    is_active: true,
    capabilities: preset.capabilities,
  };
}

function hasCapabilityProvider(
  registry: CapabilityGroup[],
  capabilityName: string
): boolean {
  const group = registry.find((g) => g.name === capabilityName);
  return (group?.provider_count ?? 0) > 0;
}

/** Register Gleam requester + ecommerce workers when missing; returns requester id. */
export async function ensureGoalDemoNetwork(): Promise<number> {
  const health = await getHealth();
  const mode: WorkerEndpointMode =
    health.worker_endpoint_mode === "docker" ? "docker" : "local";

  let registry = (await getCapabilities()).capabilities;

  for (const presetId of GOAL_DEMO_WORKER_PRESET_IDS) {
    const preset = AGENT_REGISTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) continue;
    const capName = preset.capabilities[0]?.name;
    if (!capName || hasCapabilityProvider(registry, capName)) continue;
    await registerAgent(presetToRegisterRequest(preset, mode));
    registry = (await getCapabilities()).capabilities;
  }

  const agents = (await getAgents()).agents;
  let requester = agents.find((a) => a.name === GLEAM_REQUESTER_NAME);

  if (!requester) {
    requester = await registerAgent({
      name: GLEAM_REQUESTER_NAME,
      description: "Goal coordination requester for the Gleam demo",
      endpoint_url:
        mode === "docker" ? "http://backend:8000" : "http://localhost:8000",
      owner_name: "Gleam",
      version: "1.0.0",
      cost_credits: 0,
      is_active: true,
      capabilities: [
        {
          name: "goal_orchestration",
          description: "Submits product launch goals to the agent network",
          input_schema: {
            type: "object",
            properties: { goal: { type: "string" } },
            required: ["goal"],
          },
          output_schema: {
            type: "object",
            properties: { workflow_id: { type: "string" } },
          },
        },
      ],
    });
  }

  await checkAllAgentsHealth();
  return requester.id;
}

export function parseGoalToWorkflowInput(
  goal: string,
  requesterAgentId: number
): EcommerceLaunchRequest {
  const trimmed = goal.trim();
  const forMatch = trimmed.match(/\bfor\s+(.+?)\.?$/i);
  const target_market = forMatch?.[1]?.trim() || "target customers";

  let product_name = "Premium Product";
  const launchMatch = trimmed.match(
    /(?:launch|introduce|sell|create|build)\s+(?:a\s+)?(?:premium\s+)?(.+?)(?:\s+for\s+|\s+to\s+|\.|$)/i
  );
  if (launchMatch?.[1]) {
    product_name = launchMatch[1].trim();
  } else if (trimmed.length > 0 && trimmed.length < 120) {
    product_name = trimmed.replace(/\.$/, "");
  }

  if (product_name.length > 0) {
    product_name = product_name.charAt(0).toUpperCase() + product_name.slice(1);
  }

  return {
    requester_agent_id: requesterAgentId,
    product_name,
    target_market,
    tone: "modern, trustworthy, high-converting",
  };
}

export function discoverProviders(
  registry: CapabilityGroup[]
): DiscoveredProvider[] {
  return PLANNED_CAPABILITIES.map((cap) => {
    const group = registry.find((g) => g.name === cap.name);
    const provider =
      group?.providers.find((p) => p.is_healthy) ?? group?.providers[0];
    return {
      capability: cap.name,
      capabilityLabel: cap.label,
      agentName: provider?.agent_name ?? cap.agentLabel,
      agentId: provider?.agent_id ?? null,
      healthy: provider?.is_healthy ?? true,
    };
  });
}

export function buildProviderDiscovery(
  discovered: DiscoveredProvider[]
): CapabilityProviderDiscovery[] {
  return PLANNED_CAPABILITIES.map((cap) => {
    const selected = discovered.find((d) => d.capability === cap.name);
    const pool = DEMO_CANDIDATE_POOL[cap.name] ?? [];

    const candidates: ProviderCandidate[] = pool.map((entry) => {
      const isSelected =
        selected?.agentName != null
          ? entry.name === selected.agentName
          : entry.name === cap.agentLabel;

      return {
        name: entry.name,
        selected: isSelected,
        healthy: true,
        matchPercent: isSelected ? Math.max(entry.matchPercent, 93) : entry.matchPercent,
        avgLatencySec: entry.avgLatencySec,
        agentId: isSelected ? selected?.agentId ?? null : null,
      };
    });

    if (!candidates.some((c) => c.selected) && candidates[0]) {
      candidates[0] = {
        ...candidates[0],
        selected: true,
        agentId: selected?.agentId ?? null,
      };
    }

    return { capability: cap.name, candidates };
  });
}

export function buildSelectionReasons(
  discovered: DiscoveredProvider[]
): SelectionReason[] {
  return discovered.map((d) => {
    const cap = PLANNED_CAPABILITIES.find((c) => c.name === d.capability);
    const agentName = d.agentName ?? cap?.agentLabel ?? "Provider";
    const latencyNote =
      d.capability === "seo_keywords"
        ? "low latency"
        : "compatible output schema";

    return {
      capability: d.capability,
      agentName,
      reason: `Best match for ${d.capability}, healthy endpoint, ${latencyNote}.`,
    };
  });
}

export function getTotalProvidersEvaluated(): number {
  return PLANNED_CAPABILITIES.length * 3;
}

export function buildRoutingSummary(
  result: EcommerceLaunchResponse | null
): NetworkRoutingSummary {
  const traceSteps = result?.workflow_trace?.steps;
  const executionCount = Array.isArray(traceSteps)
    ? traceSteps.length
    : PLANNED_CAPABILITIES.length;

  return {
    capabilitiesRecognized: PLANNED_CAPABILITIES.length,
    providersSelected: PLANNED_CAPABILITIES.length,
    agentExecutions: executionCount,
    handoffs: COORDINATION_HANDOFFS.length,
    outcomesGenerated: result ? 1 : 0,
    workflowId: result?.workflow_id ?? null,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
