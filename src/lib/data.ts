export type Gig = {
  id: number; title: string; company: string; age: string; description: string;
  budget: string; match: number; tags: string[]; category: string; type: string;
  badge?: string; color: "violet" | "blue" | "pink" | "orange" | "green";
  location: string;
};

export const categories = [
  { name: "Development", count: "420 projects", icon: "Code2", color: "violet" },
  { name: "Design & Creative", count: "186 projects", icon: "Palette", color: "pink" },
  { name: "Data & AI", count: "128 projects", icon: "Database", color: "blue" },
  { name: "Marketing", count: "94 projects", icon: "Megaphone", color: "orange" },
  { name: "Cloud & DevOps", count: "76 projects", icon: "Cloud", color: "green" },
  { name: "Writing & Content", count: "52 projects", icon: "FileText", color: "yellow" },
];

export const gigs: Gig[] = [
  { id: 1, title: "Senior Product Designer", company: "Orbit Labs", age: "2 hours ago", description: "Shape intuitive experiences for a fast-growing finance product.", budget: "₹80k – ₹1.2L", match: 96, tags: ["Figma", "UX Research", "Design Systems"], category: "Design & Creative", type: "Full time", badge: "FEATURED", color: "violet", location: "Remote" },
  { id: 2, title: "Data Engineer", company: "MetricFlow", age: "5 hours ago", description: "Build reliable pipelines powering real-time business insights.", budget: "₹1.2L – ₹1.6L", match: 92, tags: ["Python", "SQL", "Airflow"], category: "Data & AI", type: "Contract", badge: "URGENT", color: "blue", location: "Hybrid" },
  { id: 3, title: "Full-stack Developer", company: "Northstar", age: "1 day ago", description: "Work on a next-generation platform with a global product team.", budget: "₹1.8L – ₹2.4L", match: 90, tags: ["React", "TypeScript", "Node.js", "APIs"], category: "Development", type: "Full time", badge: "NEW", color: "violet", location: "Remote" },
  { id: 4, title: "Cloud Infrastructure Engineer", company: "Nimbus Works", age: "1 day ago", description: "Design resilient cloud infrastructure and deployment workflows.", budget: "₹90k – ₹1.4L", match: 88, tags: ["AWS", "Docker", "Terraform"], category: "Cloud & DevOps", type: "Contract", color: "green", location: "Remote" },
  { id: 5, title: "Growth Marketing Strategist", company: "Goodwell", age: "2 days ago", description: "Turn customer insight into measurable acquisition campaigns.", budget: "₹60k – ₹95k", match: 84, tags: ["SEO", "Analytics", "Content"], category: "Marketing", type: "Part time", color: "orange", location: "Hybrid" },
  { id: 6, title: "Brand & Visual Designer", company: "Studio Forma", age: "3 days ago", description: "Create a distinctive visual system for an ambitious new brand.", budget: "₹45k – ₹75k", match: 82, tags: ["Branding", "Illustrator", "Figma"], category: "Design & Creative", type: "Project", color: "pink", location: "Remote" },
];

export const talent = [
  { name: "Aarav Mehta", role: "Cloud & DevOps", skills: "AWS · Docker · Kubernetes", rate: "₹1,800/hr", rating: "4.9", projects: 32, initials: "AM", color: "blue" },
  { name: "Sara Khan", role: "Product Designer", skills: "Figma · UX Research · Prototyping", rate: "₹1,500/hr", rating: "5.0", projects: 21, initials: "SK", color: "pink" },
  { name: "Rohan Nair", role: "Data Specialist", skills: "Python · SQL · Airflow", rate: "₹2,000/hr", rating: "4.8", projects: 18, initials: "RN", color: "green" },
  { name: "Meera Joshi", role: "Full-stack Developer", skills: "React · Node.js · TypeScript", rate: "₹2,200/hr", rating: "4.9", projects: 27, initials: "MJ", color: "violet" },
];
