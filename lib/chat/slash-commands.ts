export interface SlashCommand {
  name: string;
  description: string;
  href: string;
  argHint?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "image",
    description: "Open image studio",
    href: "/images",
    argHint: "[prompt]",
  },
  {
    name: "memory",
    description: "Open memory library",
    href: "/memory",
  },
  {
    name: "agent",
    description: "Open agents",
    href: "/agents",
  },
  {
    name: "voice",
    description: "Open voice playground",
    href: "/voice",
  },
];

export function matchSlash(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const rest = input.slice(1);
  const token = rest.split(/\s/)[0]?.toLowerCase() ?? "";
  if (!token) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(token));
}

export function parseSlashArg(input: string): string {
  const m = input.match(/^\/\w+\s*(.*)$/s);
  return m?.[1]?.trim() ?? "";
}
