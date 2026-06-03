"use client";

import { Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AGENT_REGISTER_PRESETS } from "@/lib/developer-presets";
import { getApiErrorMessage, registerAgent } from "@/lib/api";
import { parseJsonField } from "@/lib/json-utils";
import type { Agent, CapabilityCreateInput } from "@/types";

interface CapabilityDraft {
  key: string;
  name: string;
  description: string;
  inputSchema: string;
  outputSchema: string;
}

interface RegisterAgentPanelProps {
  onRegistered?: (agent: Agent) => void;
}

function newCapabilityDraft(): CapabilityDraft {
  return {
    key: String(Date.now()),
    name: "summarization",
    description: "Summarizes text input.",
    inputSchema: `{
  "type": "object",
  "properties": {
    "text": { "type": "string" }
  },
  "required": ["text"]
}`,
    outputSchema: `{
  "type": "object",
  "properties": {
    "summary": { "type": "string" }
  },
  "required": ["summary"]
}`,
  };
}

export function RegisterAgentPanel({ onRegistered }: RegisterAgentPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("http://localhost:9001");
  const [ownerName, setOwnerName] = useState("Developer");
  const [version, setVersion] = useState("1.0.0");
  const [costCredits, setCostCredits] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [capabilities, setCapabilities] = useState<CapabilityDraft[]>([
    newCapabilityDraft(),
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [endpointMode, setEndpointMode] = useState<"local" | "docker">("local");

  function applyPreset(presetId: string) {
    const preset = AGENT_REGISTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setName(preset.name);
    setDescription(preset.description);
    setEndpointUrl(
      endpointMode === "docker"
        ? preset.endpoint_url_docker
        : preset.endpoint_url_local
    );
    setOwnerName(preset.owner_name);
    setVersion(preset.version);
    setCostCredits(String(preset.cost_credits));
    setCapabilities(
      preset.capabilities.map((cap) => ({
        key: `${presetId}-${cap.name}`,
        name: cap.name,
        description: cap.description,
        inputSchema: JSON.stringify(cap.input_schema, null, 2),
        outputSchema: JSON.stringify(cap.output_schema, null, 2),
      }))
    );
    setError(null);
    setSuccess(null);
  }

  function parseCapabilities(): CapabilityCreateInput[] | null {
    const parsed: CapabilityCreateInput[] = [];
    for (let i = 0; i < capabilities.length; i++) {
      const cap = capabilities[i];
      if (!cap.name.trim()) {
        setError(`Capability ${i + 1}: "name" is required`);
        return null;
      }
      if (!cap.description.trim()) {
        setError(`Capability ${i + 1}: "description" is required`);
        return null;
      }
      const inputSchema = parseJsonField<Record<string, unknown>>(
        cap.inputSchema,
        `Capability ${i + 1} input_schema`
      );
      if (!inputSchema.ok) {
        setError(inputSchema.error);
        return null;
      }
      const outputSchema = parseJsonField<Record<string, unknown>>(
        cap.outputSchema,
        `Capability ${i + 1} output_schema`
      );
      if (!outputSchema.ok) {
        setError(outputSchema.error);
        return null;
      }
      parsed.push({
        name: cap.name.trim(),
        description: cap.description.trim(),
        input_schema: inputSchema.value,
        output_schema: outputSchema.value,
      });
    }
    if (parsed.length === 0) {
      setError("Add at least one capability");
      return null;
    }
    return parsed;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!endpointUrl.trim()) {
      setError("endpoint_url is required");
      return;
    }
    if (!ownerName.trim()) {
      setError("owner_name is required");
      return;
    }

    const credits = parseInt(costCredits, 10);
    if (Number.isNaN(credits) || credits < 0) {
      setError("cost_credits must be a non-negative number");
      return;
    }

    const caps = parseCapabilities();
    if (!caps) return;

    setSubmitting(true);
    try {
      const agent = await registerAgent({
        name: name.trim(),
        description: description.trim(),
        endpoint_url: endpointUrl.trim(),
        owner_name: ownerName.trim(),
        version: version.trim() || "1.0.0",
        cost_credits: credits,
        is_active: isActive,
        capabilities: caps,
      });
      setSuccess(`Registered agent #${agent.id} — ${agent.name}`);
      onRegistered?.(agent);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          Register agent
        </CardTitle>
        <CardDescription>
          POST /agents/register — add workers to the exchange registry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick presets</p>
          <div className="flex flex-wrap gap-1.5">
            {AGENT_REGISTER_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Endpoint mode:</span>
            <Button
              type="button"
              size="sm"
              variant={endpointMode === "local" ? "default" : "outline"}
              onClick={() => setEndpointMode("local")}
            >
              localhost
            </Button>
            <Button
              type="button"
              size="sm"
              variant={endpointMode === "docker" ? "default" : "outline"}
              onClick={() => setEndpointMode("docker")}
            >
              Docker service
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Use <span className="font-mono">localhost</span> endpoints for local
            terminal runs. Use Docker service names (
            <span className="font-mono">demo-worker</span>,{" "}
            <span className="font-mono">weather-agent</span>, etc.) when the API
            runs inside Docker Compose.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reg-name">name</Label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Demo Summarizer"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reg-desc">description</Label>
              <Textarea
                id="reg-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reg-endpoint">endpoint_url</Label>
              <Input
                id="reg-endpoint"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-owner">owner_name</Label>
              <Input
                id="reg-owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-version">version</Label>
              <Input
                id="reg-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-credits">cost_credits</Label>
              <Input
                id="reg-credits"
                value={costCredits}
                onChange={(e) => setCostCredits(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="reg-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="reg-active" className="cursor-pointer">
                active
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>capabilities</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setCapabilities((prev) => [...prev, newCapabilityDraft()])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add capability
              </Button>
            </div>
            {capabilities.map((cap, index) => (
              <div
                key={cap.key}
                className="space-y-1.5 rounded-md border border-border p-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Capability {index + 1}
                  </span>
                  {capabilities.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setCapabilities((prev) =>
                          prev.filter((c) => c.key !== cap.key)
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">name</Label>
                    <Input
                      value={cap.name}
                      onChange={(e) =>
                        setCapabilities((prev) =>
                          prev.map((c) =>
                            c.key === cap.key
                              ? { ...c, name: e.target.value }
                              : c
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">description</Label>
                    <Input
                      value={cap.description}
                      onChange={(e) =>
                        setCapabilities((prev) =>
                          prev.map((c) =>
                            c.key === cap.key
                              ? { ...c, description: e.target.value }
                              : c
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">input_schema (JSON)</Label>
                    <Textarea
                      value={cap.inputSchema}
                      onChange={(e) =>
                        setCapabilities((prev) =>
                          prev.map((c) =>
                            c.key === cap.key
                              ? { ...c, inputSchema: e.target.value }
                              : c
                          )
                        )
                      }
                      rows={6}
                      className="font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px]">output_schema (JSON)</Label>
                    <Textarea
                      value={cap.outputSchema}
                      onChange={(e) =>
                        setCapabilities((prev) =>
                          prev.map((c) =>
                            c.key === cap.key
                              ? { ...c, outputSchema: e.target.value }
                              : c
                          )
                        )
                      }
                      rows={6}
                      className="font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Register agent"}
          </Button>
        </form>

        {error && (
          <p className="text-xs text-amber-400/90 font-mono rounded border border-amber-500/30 bg-amber-500/5 p-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-emerald-400/90 font-mono rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
            {success}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
