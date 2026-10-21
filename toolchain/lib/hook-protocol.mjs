const CANONICAL_EVENTS = {
  sessionstart: "SessionStart",
  pretooluse: "PreToolUse",
  posttooluse: "PostToolUse",
  stop: "Stop",
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalHookEvent(name) {
  if (typeof name !== "string") return undefined;
  return CANONICAL_EVENTS[name.toLowerCase()];
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function resolveCwd(input) {
  const direct = firstString(input.cwd);
  if (direct) return direct;
  if (Array.isArray(input.workspace_roots)) {
    const root = input.workspace_roots.find(
      (value) => typeof value === "string" && value,
    );
    if (root) return root;
  }
  return undefined;
}

export function parseHookPayload(raw, options) {
  let input;
  try {
    input = JSON.parse(raw);
  } catch (error) {
    throw new Error("Hook input must be one JSON object", { cause: error });
  }
  if (!isRecord(input)) throw new Error("Hook input must be a JSON object");
  if (!new Set(["claude", "codex"]).has(options.runtime)) {
    throw new Error(`Unsupported hook runtime: ${options.runtime}`);
  }
  const receivedEvent = canonicalHookEvent(input.hook_event_name);
  if (receivedEvent !== options.event) {
    throw new Error(
      `Hook event mismatch: expected ${options.event}, received ${input.hook_event_name}`,
    );
  }
  const sessionId = firstString(input.session_id, input.conversation_id);
  if (!sessionId) throw new Error("Hook input is missing session_id");
  const cwd = resolveCwd(input);
  if (!cwd) throw new Error("Hook input is missing cwd");
  const turnId = firstString(input.turn_id, input.generation_id);
  return {
    runtime: options.runtime,
    event: options.event,
    registrationId: options.registrationId,
    sessionId,
    cwd,
    turnId,
    toolUseId:
      typeof input.tool_use_id === "string"
        ? input.tool_use_id
        : `${turnId ?? input.prompt_id ?? sessionId}:${options.event}`,
    toolName: typeof input.tool_name === "string" ? input.tool_name : undefined,
    toolInput: isRecord(input.tool_input) ? input.tool_input : {},
    stopHookActive:
      input.stop_hook_active === true ||
      (typeof input.loop_count === "number" && input.loop_count > 0),
  };
}

export function formatHookOutput(event, result) {
  if (result.status === "fail" && result.block) {
    return { decision: "block", reason: result.message };
  }
  if (result.status === "degraded" || result.status === "fail") {
    return { systemMessage: result.message };
  }
  if (event === "Stop") return {};
  return null;
}
