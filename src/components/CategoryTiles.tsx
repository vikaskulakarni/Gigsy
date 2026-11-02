import Link from "next/link";
import { Code2, Palette, Database, Megaphone, Cloud, FileText, ArrowUpRight } from "lucide-react";
import { categories } from "@/lib/data";
const icons: Record<string, React.ElementType> = { Code2, Palette, Database, Megaphone, Cloud, FileText };
export function CategoryTiles() {
  return <div className="category-grid">{categories.map(c => { const Icon = icons[c.icon]; return <Link href={`/explore?category=${encodeURIComponent(c.name)}`} className="category-tile" key={c.name}><span className={`category-icon ${c.color}`}><Icon size={23}/></span><span className="category-copy"><strong>{c.name}</strong><small>{c.count}</small></span><ArrowUpRight size={16} className="category-arrow"/></Link>; })}</div>;
}
