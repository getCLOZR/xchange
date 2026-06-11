"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import {
  getApiErrorMessage,
  getHealth,
  registerAgent,
  validateContract,
  validateEndpoint,
} from "@/lib/api";
import {
  AGENT_REGISTER_PRESETS,
  DEFAULT_ENDPOINT_URL_LOCAL,
  endpointUrlForMode,
  swapEndpointUrlForMode,
} from "@/lib/developer-presets";
import { parseJsonField } from "@/lib/json-utils";
import { cn } from "@/lib/utils";
import type {
  Agent,
  CapabilityCreateInput,
  ContractValidationResponse,
  EndpointValidationResponse,
  WorkerEndpointMode,
} from "@/types";

const STEPS = [
  "Endpoint",
  "Contract",
  "Capabilities",
  "Review",
  "Register",
] as const;

interface CapabilityDraft {
  key: string;
  name: string;
  description: string;
  inputSchema: string;
  outputSchema: string;
}

function newCapabilityDraft(): CapabilityDraft {
  return {
    key: String(Date.now()),
    name: "",
    description: "",
    inputSchema: '{\n  "type": "object",\n  "properties": {}\n}',
    outputSchema: '{\n  "type": "object",\n  "properties": {}\n}',
  };
}

function isUnreachableError(error: string | null | undefined): boolean {
  if (!error) return false;
  const e = error.toLowerCase();
  return (
    e.includes("unreachable") ||
    e.includes("timed out") ||
    e.includes("connection refused")
  );
}

function CheckRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean | null;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {ok === true ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
      ) : ok === false ? (
        <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div>
        <p className={ok === false ? "text-red-400" : undefined}>{label}</p>
        {detail ? (
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AgentOnboardingWizard() {
  const [step, setStep] = useState(0);
  const [endpointUrl, setEndpointUrl] = useState(DEFAULT_ENDPOINT_URL_LOCAL);
  const [endpointMode, setEndpointMode] = useState<WorkerEndpointMode>("local");
  const [endpointResult, setEndpointResult] =
    useState<EndpointValidationResponse | null>(null);
  const [contractResult, setContractResult] =
    useState<ContractValidationResponse | null>(null);
  const [validatingEndpoint, setValidatingEndpoint] = useState(false);
  const [validatingContract, setValidatingContract] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [costCredits, setCostCredits] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [capabilities, setCapabilities] = useState<CapabilityDraft[]>([
    newCapabilityDraft(),
  ]);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registeredAgent, setRegisteredAgent] = useState<Agent | null>(null);

  const validationsPassed =
    endpointResult?.valid === true && contractResult?.valid === true;

  const resetValidations = useCallback(() => {
    setEndpointResult(null);
    setContractResult(null);
    setValidationError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((health) => {
        if (cancelled) return;
        const mode =
          health.worker_endpoint_mode === "docker" ? "docker" : "local";
        setEndpointMode(mode);
        setEndpointUrl(endpointUrlForMode(mode));
        resetValidations();
      })
      .catch(() => {
        // Keep localhost defaults when the API is offline.
      });
    return () => {
      cancelled = true;
    };
  }, [resetValidations]);

  function handleEndpointModeChange(mode: WorkerEndpointMode) {
    setEndpointMode(mode);
    setEndpointUrl((current) => swapEndpointUrlForMode(current, mode));
    resetValidations();
  }

  function applyPreset(presetId: string) {
    const preset = AGENT_REGISTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setEndpointUrl(
      endpointMode === "docker"
        ? preset.endpoint_url_docker
        : preset.endpoint_url_local
    );
    setName(preset.name);
    setDescription(preset.description);
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
    resetValidations();
    setRegisterError(null);
    setRegisteredAgent(null);
  }

  async function handleValidateEndpoint() {
    setValidatingEndpoint(true);
    setValidationError(null);
    setEndpointResult(null);
    try {
      const result = await validateEndpoint(endpointUrl.trim());
      setEndpointResult(result);
      if (!result.valid && result.error) {
        setValidationError(result.error);
      }
      if (result.valid && result.agent_name && !name.trim()) {
        setName(result.agent_name);
      }
      if (result.valid && result.version) {
        setVersion(result.version);
      }
    } catch (e) {
      setValidationError(getApiErrorMessage(e));
    } finally {
      setValidatingEndpoint(false);
    }
  }

  async function handleValidateContract() {
    setValidatingContract(true);
    setValidationError(null);
    setContractResult(null);
    try {
      const result = await validateContract(endpointUrl.trim());
      setContractResult(result);
      if (!result.valid && result.error) {
        setValidationError(result.error);
      }
    } catch (e) {
      setValidationError(getApiErrorMessage(e));
    } finally {
      setValidatingContract(false);
    }
  }

  function parseCapabilities(): CapabilityCreateInput[] | null {
    const errors: string[] = [];
    const parsed: CapabilityCreateInput[] = [];
    capabilities.forEach((cap, i) => {
      const label = `Capability ${i + 1}`;
      if (!cap.name.trim()) {
        errors.push(`${label}: name is required`);
        return;
      }
      const input = parseJsonField<Record<string, unknown>>(
        cap.inputSchema,
        `${label} input_schema`
      );
      if (!input.ok) {
        errors.push(input.error);
        return;
      }
      const output = parseJsonField<Record<string, unknown>>(
        cap.outputSchema,
        `${label} output_schema`
      );
      if (!output.ok) {
        errors.push(output.error);
        return;
      }
      parsed.push({
        name: cap.name.trim(),
        description: cap.description.trim() || cap.name.trim(),
        input_schema: input.value,
        output_schema: output.value,
      });
    });
    if (parsed.length === 0) {
      errors.push("Add at least one capability");
    }
    setConfigErrors(errors);
    return errors.length === 0 ? parsed : null;
  }

  function validateConfigStep(): boolean {
    const errors: string[] = [];
    if (!name.trim()) errors.push("Agent name is required");
    if (!endpointUrl.trim()) errors.push("Endpoint URL is required");
    if (!ownerName.trim()) errors.push("Owner name is required");
    const credits = Number(costCredits);
    if (!Number.isFinite(credits) || credits < 0) {
      errors.push("Cost credits must be a non-negative number");
    }
    const caps = parseCapabilities();
    if (!caps) {
      setConfigErrors(errors);
      return false;
    }
    if (errors.length > 0) {
      setConfigErrors(errors);
      return false;
    }
    setConfigErrors([]);
    return true;
  }

  const parsedCapabilities = useMemo(() => {
    const caps: CapabilityCreateInput[] = [];
    for (const cap of capabilities) {
      if (!cap.name.trim()) continue;
      const input = parseJsonField(cap.inputSchema, "input");
      const output = parseJsonField(cap.outputSchema, "output");
      if (!input.ok || !output.ok) continue;
      caps.push({
        name: cap.name.trim(),
        description: cap.description.trim() || cap.name.trim(),
        input_schema: input.value,
        output_schema: output.value,
      });
    }
    return caps;
  }, [capabilities]);

  const configStepValid = useMemo(() => {
    if (!name.trim() || !endpointUrl.trim() || !ownerName.trim()) return false;
    const credits = Number(costCredits);
    if (!Number.isFinite(credits) || credits < 0) return false;
    if (capabilities.length === 0) return false;
    for (const cap of capabilities) {
      if (!cap.name.trim()) return false;
      if (!parseJsonField(cap.inputSchema, "input").ok) return false;
      if (!parseJsonField(cap.outputSchema, "output").ok) return false;
    }
    return true;
  }, [name, endpointUrl, ownerName, costCredits, capabilities]);

  async function handleRegister() {
    if (!validationsPassed) {
      setRegisterError("Complete endpoint and contract validation before registering.");
      return;
    }
    const caps = parseCapabilities();
    if (!caps) return;
    const credits = Number(costCredits);
    setRegistering(true);
    setRegisterError(null);
    try {
      const agent = await registerAgent({
        name: name.trim(),
        description: description.trim() || name.trim(),
        endpoint_url: endpointUrl.trim(),
        owner_name: ownerName.trim(),
        version: version.trim() || "1.0.0",
        cost_credits: credits,
        is_active: isActive,
        capabilities: caps,
      });
      setRegisteredAgent(agent);
      setStep(4);
    } catch (e) {
      setRegisterError(getApiErrorMessage(e));
    } finally {
      setRegistering(false);
    }
  }

  function canAdvance(): boolean {
    if (step === 0) return endpointResult?.valid === true;
    if (step === 1) return contractResult?.valid === true;
    if (step === 2) return configStepValid;
    if (step === 3) return validationsPassed;
    return false;
  }

  function goNext() {
    if (step === 2 && !validateConfigStep()) return;
    if (step < 3) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 0 && step < 4) setStep((s) => s - 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Agent Onboarding
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Validate that your agent is reachable and Gleam contract-compliant
          before registering on the exchange.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => {
          const done = index < step || (step === 4 && index < 4);
          const current = index === step;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                current && "border-primary/50 bg-primary/10",
                done && !current && "border-emerald-500/30 text-emerald-400",
                !done && !current && "border-border text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  done ? "bg-emerald-500/20" : "bg-muted"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 0 && "Step 1 — Endpoint validation"}
            {step === 1 && "Step 2 — Contract validation"}
            {step === 2 && "Step 3 — Agent configuration"}
            {step === 3 && "Step 4 — Review"}
            {step === 4 && "Registration complete"}
          </CardTitle>
          <CardDescription>
            {step === 0 &&
              "Confirm the worker /health endpoint is reachable and returns a valid Gleam health payload."}
            {step === 1 &&
              "Probe POST /execute with a validation request. Success and structured error responses both count as valid."}
            {step === 2 &&
              "Describe capabilities your agent exposes. JSON schemas are validated as you configure."}
            {step === 3 &&
              "Review everything before registering on the exchange."}
            {step === 4 &&
              "Your agent is registered and ready for health checks in the Developer Console."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(step === 0 || step === 1) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">
                Quick-fill endpoint:
              </span>
              {AGENT_REGISTER_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}

          {step === 0 && (
            <>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={endpointMode === "local" ? "default" : "outline"}
                  onClick={() => handleEndpointModeChange("local")}
                >
                  localhost
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={endpointMode === "docker" ? "default" : "outline"}
                  onClick={() => handleEndpointModeChange("docker")}
                >
                  Docker network
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">Endpoint URL</Label>
                <Input
                  id="endpoint"
                  value={endpointUrl}
                  onChange={(e) => {
                    setEndpointUrl(e.target.value);
                    resetValidations();
                  }}
                  placeholder="http://weather-agent:9101"
                  className="font-mono text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={handleValidateEndpoint}
                disabled={validatingEndpoint || !endpointUrl.trim()}
              >
                {validatingEndpoint ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Validating…
                  </>
                ) : (
                  "Validate Endpoint"
                )}
              </Button>
              <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2">
                <CheckRow
                  label="Endpoint reachable"
                  ok={
                    endpointResult === null
                      ? null
                      : endpointResult.valid ||
                        !isUnreachableError(endpointResult.error)
                  }
                  detail={
                    endpointResult?.valid && endpointResult.response_time_ms != null
                      ? `${endpointResult.response_time_ms} ms`
                      : endpointResult && !endpointResult.valid
                        ? endpointResult.error ?? undefined
                        : undefined
                  }
                />
                <CheckRow
                  label="Health contract valid"
                  ok={
                    endpointResult === null ? null : endpointResult.valid
                  }
                />
                <CheckRow
                  label="Agent name"
                  ok={
                    endpointResult?.valid
                      ? true
                      : endpointResult
                        ? false
                        : null
                  }
                  detail={endpointResult?.agent_name ?? undefined}
                />
                <CheckRow
                  label="Version"
                  ok={
                    endpointResult?.valid
                      ? true
                      : endpointResult
                        ? false
                        : null
                  }
                  detail={endpointResult?.version ?? undefined}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground font-mono">
                {endpointUrl}
              </p>
              <Button
                type="button"
                onClick={handleValidateContract}
                disabled={validatingContract || !endpointUrl.trim()}
              >
                {validatingContract ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Validating…
                  </>
                ) : (
                  "Validate Execute Contract"
                )}
              </Button>
              <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2">
                <CheckRow
                  label="Execute endpoint exists"
                  ok={
                    contractResult === null
                      ? null
                      : contractResult.execute_endpoint || contractResult.valid
                  }
                />
                <CheckRow
                  label="Response contract valid"
                  ok={
                    contractResult === null
                      ? null
                      : contractResult.response_contract || contractResult.valid
                  }
                />
                <CheckRow
                  label="Error handling valid"
                  ok={
                    contractResult === null
                      ? null
                      : contractResult.error_handling_valid || contractResult.valid
                  }
                  detail={contractResult?.response_status ?? undefined}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent name</Label>
                  <Input
                    id="agent-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner">Owner name</Label>
                  <Input
                    id="owner"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">Cost credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min={0}
                    value={costCredits}
                    onChange={(e) => setCostCredits(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="active">Active on exchange</Label>
                </div>
              </div>

              {capabilities.map((cap, index) => {
                const inputParse = parseJsonField(cap.inputSchema, "input");
                const outputParse = parseJsonField(cap.outputSchema, "output");
                return (
                <div
                  key={cap.key}
                  className="rounded-md border border-border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Capability {index + 1}</p>
                    {capabilities.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCapabilities((list) =>
                            list.filter((c) => c.key !== cap.key)
                          )
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={cap.name}
                        onChange={(e) =>
                          setCapabilities((list) =>
                            list.map((c) =>
                              c.key === cap.key
                                ? { ...c, name: e.target.value }
                                : c
                            )
                          )
                        }
                        placeholder="summarization"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={cap.description}
                        onChange={(e) =>
                          setCapabilities((list) =>
                            list.map((c) =>
                              c.key === cap.key
                                ? { ...c, description: e.target.value }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>input_schema (JSON)</Label>
                      <Textarea
                        value={cap.inputSchema}
                        onChange={(e) =>
                          setCapabilities((list) =>
                            list.map((c) =>
                              c.key === cap.key
                                ? { ...c, inputSchema: e.target.value }
                                : c
                            )
                          )
                        }
                        rows={6}
                        className="font-mono text-xs"
                      />
                      {!inputParse.ok ? (
                        <p className="text-xs text-red-400">{inputParse.error}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>output_schema (JSON)</Label>
                      <Textarea
                        value={cap.outputSchema}
                        onChange={(e) =>
                          setCapabilities((list) =>
                            list.map((c) =>
                              c.key === cap.key
                                ? { ...c, outputSchema: e.target.value }
                                : c
                            )
                          )
                        }
                        rows={6}
                        className="font-mono text-xs"
                      />
                      {!outputParse.ok ? (
                        <p className="text-xs text-red-400">{outputParse.error}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCapabilities((list) => [...list, newCapabilityDraft()])
                }
              >
                Add capability
              </Button>

              {configErrors.length > 0 ? (
                <ul className="text-sm text-red-400 space-y-1">
                  {configErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {step === 3 && (
            <dl className="space-y-3 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <dt className="text-muted-foreground">Agent name</dt>
                <dd className="font-medium">{name}</dd>
                <dt className="text-muted-foreground">Endpoint</dt>
                <dd className="font-mono text-xs break-all">{endpointUrl}</dd>
                <dt className="text-muted-foreground">Health validation</dt>
                <dd>
                  <Badge variant={endpointResult?.valid ? "success" : "warning"}>
                    {endpointResult?.valid ? "PASS" : "FAIL"}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">Contract validation</dt>
                <dd>
                  <Badge variant={contractResult?.valid ? "success" : "warning"}>
                    {contractResult?.valid ? "PASS" : "FAIL"}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">Capabilities</dt>
                <dd>{parsedCapabilities.map((c) => c.name).join(", ")}</dd>
                <dt className="text-muted-foreground">Owner</dt>
                <dd>{ownerName}</dd>
                <dt className="text-muted-foreground">Version</dt>
                <dd>{version}</dd>
                <dt className="text-muted-foreground">Cost credits</dt>
                <dd>{costCredits}</dd>
                <dt className="text-muted-foreground">Active</dt>
                <dd>{isActive ? "Yes" : "No"}</dd>
              </div>
              {registerError ? (
                <p className="text-sm text-red-400">{registerError}</p>
              ) : null}
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={!validationsPassed || registering}
                onClick={handleRegister}
              >
                {registering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Registering…
                  </>
                ) : (
                  "Register Agent"
                )}
              </Button>
            </dl>
          )}

          {step === 4 && registeredAgent && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <p className="text-lg font-semibold">Agent registered successfully</p>
              <p className="text-sm text-muted-foreground">
                {registeredAgent.name} (ID {registeredAgent.id}) is on the
                exchange. Run a health check from the Developer Console.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/">View in Developer Console</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/?highlightAgent=${registeredAgent.id}`}>
                    View registered agent
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {validationError && step < 3 ? (
            <p className="text-sm text-red-400">{validationError}</p>
          ) : null}

          {step < 3 && (
            <div className="flex justify-between pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button type="button" onClick={goNext} disabled={!canAdvance()}>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
