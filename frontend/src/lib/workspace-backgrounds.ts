const WORKSPACE_BACKGROUNDS = {
  "/dashboard": "/backgrounds/dashboard.webp",
  "/documents": "/backgrounds/documents.webp",
  "/event-review": "/backgrounds/event-review.webp",
  "/events": "/backgrounds/events.webp",
  "/settings": "/backgrounds/settings.webp",
} as const;

export function getWorkspaceBackground(currentPath: string): string {
  return WORKSPACE_BACKGROUNDS[currentPath as keyof typeof WORKSPACE_BACKGROUNDS]
    ?? WORKSPACE_BACKGROUNDS["/dashboard"];
}
