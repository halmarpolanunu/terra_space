import Link from "next/link";

export const NAV_GROUPS = [
  {
    label: "Terra Insight",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/events", label: "Events" },
    ],
  },
  {
    label: "Terra Sense",
    items: [
      { href: "/sense", label: "Overview" },
      { href: "/documents", label: "Sources" },
      { href: "/event-review", label: "Event Review" },
      { href: "/sense/event-types", label: "Event Types" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/settings", label: "Local AI" }],
  },
] as const;

type NavigationProps = { currentPath: string };

export function Navigation({ currentPath }: NavigationProps) {
  return (
    <nav aria-label="Primary navigation">
      {NAV_GROUPS.map((group, groupIndex) => (
        <section aria-labelledby={`navigation-group-${groupIndex}`} key={group.label}>
          <h2 id={`navigation-group-${groupIndex}`}>{group.label}</h2>
          <ul className="nav-list">
            {group.items.map((item, itemIndex) => {
              const index = NAV_GROUPS.slice(0, groupIndex).reduce(
                (total, previousGroup) => total + previousGroup.items.length,
                itemIndex,
              );

              return (
                <li key={item.href}>
                  <Link
                    aria-current={currentPath === item.href ? "page" : undefined}
                    className="nav-link"
                    href={item.href}
                  >
                    <span aria-hidden="true" className="nav-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
