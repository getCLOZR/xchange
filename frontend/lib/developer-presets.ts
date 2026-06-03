import type { CapabilityCreateInput } from "@/types";

export interface AgentRegisterPreset {
  id: string;
  label: string;
  name: string;
  description: string;
  endpoint_url_local: string;
  endpoint_url_docker: string;
  owner_name: string;
  version: string;
  cost_credits: number;
  capabilities: CapabilityCreateInput[];
}

export interface DispatchPreset {
  id: string;
  label: string;
  capability: string;
  task_type: string;
  input_payload: Record<string, unknown>;
}

const SUMMARIZATION_CAPABILITY: CapabilityCreateInput = {
  name: "summarization",
  description: "Summarizes text input.",
  input_schema: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  output_schema: {
    type: "object",
    properties: { summary: { type: "string" } },
    required: ["summary"],
  },
};

export const AGENT_REGISTER_PRESETS: AgentRegisterPreset[] = [
  {
    id: "demo-summarizer",
    label: "Demo Summarizer",
    name: "Demo Summarizer",
    description: "Local demo worker for summarization tasks",
    endpoint_url_local: "http://localhost:9001",
    endpoint_url_docker: "http://demo-worker:9001",
    owner_name: "CLOZR Demo",
    version: "1.0.0",
    cost_credits: 1,
    capabilities: [SUMMARIZATION_CAPABILITY],
  },
  {
    id: "weather",
    label: "External Weather",
    name: "External Weather Agent",
    description: "Contract-only weather lookup worker",
    endpoint_url_local: "http://localhost:9101",
    endpoint_url_docker: "http://weather-agent:9101",
    owner_name: "External",
    version: "1.0.0",
    cost_credits: 2,
    capabilities: [
      {
        name: "weather_lookup",
        description: "Look up weather for a location",
        input_schema: {
          type: "object",
          properties: { location: { type: "string" } },
          required: ["location"],
        },
        output_schema: {
          type: "object",
          properties: {
            location: { type: "string" },
            temperature_f: { type: "number" },
            conditions: { type: "string" },
          },
        },
      },
    ],
  },
  {
    id: "translator",
    label: "External Translator",
    name: "External Translator Agent",
    description: "Contract-only translation worker",
    endpoint_url_local: "http://localhost:9102",
    endpoint_url_docker: "http://translator-agent:9102",
    owner_name: "External",
    version: "1.0.0",
    cost_credits: 2,
    capabilities: [
      {
        name: "translation",
        description: "Translate text to a target language",
        input_schema: {
          type: "object",
          properties: {
            text: { type: "string" },
            target_language: { type: "string" },
          },
          required: ["text", "target_language"],
        },
        output_schema: {
          type: "object",
          properties: {
            translated_text: { type: "string" },
            target_language: { type: "string" },
          },
        },
      },
    ],
  },
  {
    id: "search",
    label: "External Search",
    name: "External Search Agent",
    description: "Contract-only web search worker",
    endpoint_url_local: "http://localhost:9103",
    endpoint_url_docker: "http://search-agent:9103",
    owner_name: "External",
    version: "1.0.0",
    cost_credits: 3,
    capabilities: [
      {
        name: "web_search",
        description: "Search the web for a query",
        input_schema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
        output_schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            results: { type: "array" },
          },
        },
      },
    ],
  },
];

export const DISPATCH_PRESETS: DispatchPreset[] = [
  {
    id: "summarization",
    label: "Summarization",
    capability: "summarization",
    task_type: "summarize_text",
    input_payload: {
      text: "CLOZR Exchange routes tasks across specialized agents.",
    },
  },
  {
    id: "weather",
    label: "Weather",
    capability: "weather_lookup",
    task_type: "get_weather",
    input_payload: { location: "Chicago" },
  },
  {
    id: "translation",
    label: "Translation",
    capability: "translation",
    task_type: "translate_text",
    input_payload: { text: "hello", target_language: "Spanish" },
  },
  {
    id: "search",
    label: "Search",
    capability: "web_search",
    task_type: "search_query",
    input_payload: { query: "What are AI agents?" },
  },
  {
    id: "failure-test",
    label: "Failure test",
    capability: "summarization",
    task_type: "summarize_text",
    input_payload: { force_error: true },
  },
];

export const DEFAULT_CAPABILITY_JSON = JSON.stringify(
  SUMMARIZATION_CAPABILITY,
  null,
  2
);

export const DEFAULT_DISPATCH_PAYLOAD = JSON.stringify(
  { text: "CLOZR routes tasks across specialized agents." },
  null,
  2
);
