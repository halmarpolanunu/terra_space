const WORKSPACE_BACKGROUNDS = {
  "/home": "/backgrounds/dashboard.webp",
  "/explore": "/backgrounds/events.webp",
  "/prepare": "/backgrounds/sense.webp",
  "/documents": "/backgrounds/documents.webp",
  "/event-review": "/backgrounds/event-review.webp",
  "/settings": "/backgrounds/settings.webp",
  "/sense": "/backgrounds/sense.webp",
  "/sense/event-types": "/backgrounds/sense.webp",
} as const;

export function getWorkspaceBackground(currentPath: string): string {
  return WORKSPACE_BACKGROUNDS[currentPath as keyof typeof WORKSPACE_BACKGROUNDS]
    ?? WORKSPACE_BACKGROUNDS["/home"];
}
