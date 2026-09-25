import Link from "next/link";

const NAV = [
  { href: "/home", label: "Home", children: [] },
  { href: "/explore", label: "Explore", children: [] },
  { href: "/prepare", label: "Prepare", children: [
    { href: "/documents", label: "Sources" }, { href: "/sense", label: "Pipeline overview" },
    { href: "/event-review", label: "Earlier Event Review" }, { href: "/sense/event-types", label: "Event taxonomy" },
    { href: "/sense/actors", label: "Actors" },
  ] },
  { href: "/settings", label: "Settings", children: [] },
] as const;

export function Navigation({ currentPath }: { currentPath: string }) {
  return <nav aria-label="Primary navigation"><ul className="nav-list">
    {NAV.map((item, index) => <li key={item.href}>
      <Link href={item.href} className="nav-link nav-primary" aria-current={currentPath === item.href ? "page" : undefined}
        data-active-parent={item.children.some((child) => child.href === currentPath) ? "true" : undefined}>
        <span aria-hidden="true" className="nav-index">{String(index + 1).padStart(2, "0")}</span><span>{item.label}</span>
      </Link>
      {item.children.length > 0 && <ul className="nav-sublist">
        {item.children.map((child) => <li key={child.href}><Link href={child.href} className="nav-link nav-secondary" aria-current={currentPath === child.href ? "page" : undefined}>{child.label}</Link></li>)}
      </ul>}
    </li>)}
  </ul></nav>;
}
