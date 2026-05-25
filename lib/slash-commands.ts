/**
 * Slash command registry. Each command parses "/name args…" out of the chat
 * input and either runs a UI action (returning void → don't send to model) or
 * rewrites the input into a normal user message (returning a string to send).
 */

export interface SlashContext {
  newChat: () => void;
  clearAll: () => void;
  setModel: (id: string) => void;
  router: { push: (href: string) => void };
}

export interface SlashCommand {
  name: string;
  description: string;
  argHint?: string;
  /** Return string to send as a normal user message; return void to suppress. */
  execute: (args: string, ctx: SlashContext) => void | string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "new",
    description: "Start a new chat",
    execute: (_args, ctx) => {
      ctx.newChat();
    },
  },
  {
    name: "clear",
    description: "Delete all conversations",
    execute: (_args, ctx) => {
      if (typeof window !== "undefined") {
        const ok = window.confirm("Delete all conversations? This cannot be undone.");
        if (!ok) return;
      }
      ctx.clearAll();
    },
  },
  {
    name: "model",
    description: "Switch the active model",
    argHint: "<id>",
    execute: (args, ctx) => {
      const id = args.trim();
      if (!id) return;
      ctx.setModel(id);
    },
  },
  {
    name: "image",
    description: "Open the image studio with this prompt",
    argHint: "<prompt>",
    execute: (args, ctx) => {
      const prompt = args.trim();
      const q = prompt ? `?prompt=${encodeURIComponent(prompt)}` : "";
      ctx.router.push(`/images${q}`);
    },
  },
  {
    name: "help",
    description: "List available slash commands",
    execute: () => {
      return SLASH_COMMANDS.map(
        (c) => `\`/${c.name}${c.argHint ? " " + c.argHint : ""}\` — ${c.description}`,
      ).join("\n");
    },
  },
];

export interface ParsedSlash {
  command: SlashCommand;
  args: string;
}

/** Returns the command + args if `input` starts with a known slash command name. */
export function parseSlash(input: string): ParsedSlash | null {
  if (!input.startsWith("/")) return null;
  const space = input.indexOf(" ");
  const name = (space === -1 ? input.slice(1) : input.slice(1, space)).toLowerCase();
  if (!name) return null;
  const cmd = SLASH_COMMANDS.find((c) => c.name === name);
  if (!cmd) return null;
  return { command: cmd, args: space === -1 ? "" : input.slice(space + 1) };
}

/** For the inline popup — fuzzy-prefix-match by name. */
export function matchSlash(prefix: string): SlashCommand[] {
  if (!prefix.startsWith("/")) return [];
  const after = prefix.slice(1).toLowerCase();
  if (after.includes(" ")) return [];
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(after));
}
