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
  {
    id: "product-research",
    label: "Product Research",
    name: "Product Research Agent",
    description: "Ecommerce market research demo worker",
    endpoint_url_local: "http://localhost:9201",
    endpoint_url_docker: "http://product-research-agent:9201",
    owner_name: "CLOZR Demo",
    version: "1.0.0",
    cost_credits: 1,
    capabilities: [
      {
        name: "product_research",
        description: "Research product market and competitors",
        input_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            target_market: { type: "string" },
          },
          required: ["product_name", "target_market"],
        },
        output_schema: {
          type: "object",
          properties: {
            market_summary: { type: "string" },
            competitors: { type: "array" },
            customer_angles: { type: "array" },
          },
        },
      },
    ],
  },
  {
    id: "seo-keywords",
    label: "SEO Keywords",
    name: "SEO Keyword Agent",
    description: "Ecommerce SEO keyword demo worker",
    endpoint_url_local: "http://localhost:9202",
    endpoint_url_docker: "http://seo-keyword-agent:9202",
    owner_name: "CLOZR Demo",
    version: "1.0.0",
    cost_credits: 1,
    capabilities: [
      {
        name: "seo_keywords",
        description: "Generate SEO keywords from market research",
        input_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            market_summary: { type: "string" },
            target_market: { type: "string" },
          },
          required: ["product_name"],
        },
        output_schema: {
          type: "object",
          properties: {
            primary_keywords: { type: "array" },
            long_tail_keywords: { type: "array" },
          },
        },
      },
    ],
  },
  {
    id: "product-copy",
    label: "Product Copy",
    name: "Product Copy Agent",
    description: "Ecommerce product listing copy demo worker",
    endpoint_url_local: "http://localhost:9203",
    endpoint_url_docker: "http://product-copy-agent:9203",
    owner_name: "CLOZR Demo",
    version: "1.0.0",
    cost_credits: 1,
    capabilities: [
      {
        name: "product_copy",
        description: "Generate product title, description, and bullets",
        input_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            target_market: { type: "string" },
            primary_keywords: { type: "array" },
            customer_angles: { type: "array" },
          },
          required: ["product_name"],
        },
        output_schema: {
          type: "object",
          properties: {
            product_title: { type: "string" },
            product_description: { type: "string" },
            bullet_points: { type: "array" },
            meta_description: { type: "string" },
          },
        },
      },
    ],
  },
  {
    id: "marketing-copy",
    label: "Marketing Copy",
    name: "Marketing Copy Agent",
    description: "Ecommerce marketing and launch copy demo worker",
    endpoint_url_local: "http://localhost:9204",
    endpoint_url_docker: "http://marketing-copy-agent:9204",
    owner_name: "CLOZR Demo",
    version: "1.0.0",
    cost_credits: 1,
    capabilities: [
      {
        name: "marketing_copy",
        description: "Generate ads and email subjects for launch",
        input_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            product_title: { type: "string" },
            product_description: { type: "string" },
            tone: { type: "string" },
          },
          required: ["product_name", "product_title"],
        },
        output_schema: {
          type: "object",
          properties: {
            ad_copy: { type: "array" },
            email_subjects: { type: "array" },
            launch_angle: { type: "string" },
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
