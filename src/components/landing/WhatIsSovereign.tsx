import { Globe, LayoutDashboard, Users } from "lucide-react";

const COLUMNS = [
  {
    icon: LayoutDashboard,
    title: "A Living Nation",
    text: "Every decision ripples across a simulated economy, a fractured congress, criminal organisations, and a watching world. The country moves whether you act or not.",
  },
  {
    icon: Users,
    title: "Advisors With Agendas",
    text: "Five advisors brief you each turn. They have distinct personalities, conflicting priorities, and one of them has interests that aren't entirely yours.",
  },
  {
    icon: Globe,
    title: "No Right Answers",
    text: "Raising interest rates may control inflation but slow growth. Military crackdowns improve security but damage civil liberties. Every choice costs something.",
  },
];

export function WhatIsSovereign() {
  return (
    <section className="landing-fade-in mx-auto max-w-5xl px-6 py-24">
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
        {COLUMNS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="text-center sm:text-left">
            <Icon size={22} className="mx-auto text-accent sm:mx-0" />
            <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
