import Link from "next/link";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/event-review", label: "Event Review" },
  { href: "/events", label: "Events" },
  { href: "/settings", label: "Settings" },
] as const;

type NavigationProps = { currentPath: string };

export function Navigation({ currentPath }: NavigationProps) {
  return (
    <nav aria-label="Primary navigation">
      <ul className="nav-list">
        {NAV_ITEMS.map((item, index) => (
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
        ))}
      </ul>
    </nav>
  );
}
