"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Building2, HeartHandshake, Landmark, UserRoundCheck } from "lucide-react";

type Audience = {
  id: string;
  title: string;
  eyebrow: string;
  text: string;
  points: string[];
  icon: ComponentType<{ className?: string }>;
};

const audiences: Audience[] = [
  {
    id: "residents",
    title: "Residents",
    eyebrow: "Care and stability",
    text: "A clearer route from referral to safe accommodation, with support notes, plans and documents kept together.",
    points: ["Weekly support evidence", "Tenancy and document clarity", "Risk and safeguarding visibility"],
    icon: HeartHandshake,
  },
  {
    id: "councils",
    title: "Councils",
    eyebrow: "Audit-ready evidence",
    text: "Structured records for referrals, support outcomes, risk actions and council-ready reporting.",
    points: ["Referral pipeline", "Outcome summaries", "Compliance audit trail"],
    icon: Landmark,
  },
  {
    id: "landlords",
    title: "Landlords",
    eyebrow: "Property confidence",
    text: "A practical view of property assignments, contracts, payments, maintenance and key documents.",
    points: ["Property metadata", "Rent and payment visibility", "Maintenance tracking"],
    icon: Building2,
  },
  {
    id: "referrers",
    title: "Referrers",
    eyebrow: "Faster placement flow",
    text: "A connected journey for social workers, charities and partners moving from enquiry to onboarding.",
    points: ["Eligibility and needs capture", "Follow-up reminders", "Move-in readiness"],
    icon: UserRoundCheck,
  },
];

export function PublicServiceSelector({ primary, accent }: { primary: string; accent: string }) {
  const [activeId, setActiveId] = useState(audiences[0].id);
  const active = useMemo(() => audiences.find((audience) => audience.id === activeId) ?? audiences[0], [activeId]);
  const Icon = active.icon;

  return (
    <section className="ush-section ush-audience" id="support">
      <div className="ush-section-head">
        <p className="ush-kicker" style={{ color: accent }}>Choose your path</p>
        <h2 style={{ color: primary }}>Support that speaks to every stakeholder.</h2>
        <p>Residents, councils, landlords and referrers each need a different view of the same trusted operating model.</p>
      </div>

      <div className="ush-audience-grid">
        <div className="ush-audience-tabs" role="tablist" aria-label="Service audiences">
          {audiences.map((audience) => (
            <button
              key={audience.id}
              type="button"
              role="tab"
              aria-selected={activeId === audience.id}
              onClick={() => setActiveId(audience.id)}
              className={activeId === audience.id ? "is-active" : ""}
            >
              <audience.icon className="h-5 w-5" />
              <span>{audience.title}</span>
            </button>
          ))}
        </div>

        <article className="ush-audience-panel">
          <div className="ush-audience-icon" style={{ backgroundColor: `${accent}22`, color: primary }}>
            <Icon className="h-8 w-8" />
          </div>
          <p className="ush-panel-eyebrow" style={{ color: accent }}>{active.eyebrow}</p>
          <h3 style={{ color: primary }}>{active.title}</h3>
          <p>{active.text}</p>
          <ul>
            {active.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
