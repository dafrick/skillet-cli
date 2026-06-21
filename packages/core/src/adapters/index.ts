import { agentsAdapter } from './agents.js';
import { claudeAdapter } from './claude.js';
import { codexAdapter } from './codex.js';
import { copilotAdapter } from './copilot.js';
import { geminiAdapter } from './gemini.js';
import { registerAdapter, registry } from './registry.js';

registry.register(claudeAdapter);
registry.register(copilotAdapter);
registry.register(agentsAdapter);
registry.register(geminiAdapter);
registry.register(codexAdapter);

export type { Adapter, Context, DetectResult } from './registry.js';
export { registerAdapter, registry };
