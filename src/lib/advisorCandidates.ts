export type AdvisorRole =
  | "security"
  | "economic"
  | "foreign"
  | "social"
  | "chief_of_staff";

export interface AdvisorCandidate {
  id: string;
  role: AdvisorRole;
  name: string;
  age: number;
  title: string;
  background: string; // two paragraphs
  strengths: string[]; // three items
  weakness: string; // one item
  personality: string; // used in AI prompts
  hidden: boolean; // true = has a hidden conflict of interest
  avatarSeed: string; // for generating consistent SVG avatar
}

/** A candidate the player has chosen for their cabinet. */
export interface SelectedAdvisor extends AdvisorCandidate {
  selected: true;
}

export const ADVISOR_CANDIDATES: AdvisorCandidate[] = [
  // SECURITY & DEFENCE — 4 candidates, show 3
  {
    id: "cardoso",
    role: "security",
    name: "General Hélio Cardoso",
    age: 58,
    title: "Former Commander, Brazilian Army",
    background:
      "Thirty years of active service culminating in command of the Army's Amazon Operations Division. Led the federal response to the 2019 border security crisis and received commendations for anti-narcotics operations in Mato Grosso do Sul. Respected — and feared — within the military establishment.\n\nCardoso believes that the state's primary obligation is the monopoly on force, and that hesitation invites disorder. He has little patience for diplomatic qualifications or human rights concerns when operational security is at stake. Critics within the judiciary have flagged his methods; his supporters point to results.",
    strengths: [
      "Deep military relationships",
      "Decisive under pressure",
      "Anti-cartel expertise",
    ],
    weakness: "Will push for escalation when de-escalation may be wiser",
    personality:
      "Blunt, direct, and military-minded. Thinks in terms of objectives and force. Distrusts diplomacy and civilian oversight. Always recommends stronger action.",
    hidden: false,
    avatarSeed: "cardoso",
  },
  {
    id: "borges_r",
    role: "security",
    name: "Dr. Renata Borges",
    age: 47,
    title: "Former Director, Federal Police",
    background:
      "Rose through the Federal Police as an intelligence analyst before leading two of Brazil's most successful anti-trafficking operations. Known for surgical precision rather than overwhelming force — her operations produced fewer casualties and more convictions than comparable military-led operations.\n\nBorges has strong relationships with congressional oversight committees and international law enforcement partners including the DEA and Interpol. She approaches security as an institutional problem rather than a military one, and believes that the courts are as important as the police in dismantling criminal networks.",
    strengths: [
      "Intelligence-led operations",
      "Congressional relationships",
      "International law enforcement network",
    ],
    weakness: "Slower to act than situations sometimes demand",
    personality:
      "Methodical, precise, and institution-minded. Prefers intelligence over force. Values legal process. Will always flag the risks of heavy-handed action.",
    hidden: false,
    avatarSeed: "borges_r",
  },
  {
    id: "tavares",
    role: "security",
    name: "Coronel Marcos Tavares",
    age: 52,
    title: "Former Military Police Commander, Rio de Janeiro",
    background:
      "Twenty years leading urban security operations in Rio de Janeiro, including the controversial but effective pacification programme in the northern favela complexes. Tavares is unusual in the security establishment for his genuine understanding of community dynamics — he has spoken publicly about the limits of force in addressing organised crime.\n\nHis record is mixed: real operational successes alongside documented incidents of excessive force that he addressed internally but never fully resolved. He represents a middle path between Cardoso's maximalism and Borges's caution.",
    strengths: [
      "Urban operations expertise",
      "Community relations understanding",
      "Pragmatic and adaptable",
    ],
    weakness: "Past excessive force incidents may create political vulnerabilities",
    personality:
      "Pragmatic and experienced. Understands both the operational and community dimensions of security. More moderate than military hardliners, more operational than intelligence officers.",
    hidden: false,
    avatarSeed: "tavares",
  },
  {
    id: "silva_a",
    role: "security",
    name: "Dra. Amanda Silva",
    age: 44,
    title: "Security Policy Director, Ministry of Justice",
    background:
      "A civilian security expert who has spent fifteen years designing federal crime policy from inside the Ministry of Justice. Never served in uniform, which is either a strength or a weakness depending on who you ask. Her reform of the federal witness protection programme is widely credited with breaking several major criminal networks without a single shot fired.\n\nSilva is respected by human rights organisations and viewed with scepticism by the military. She will push for systemic reform over operational deployment, and will consistently argue that criminal justice reform is a more effective long-term security tool than military operations.",
    strengths: [
      "Policy design expertise",
      "Human rights credibility",
      "Systemic reform focus",
    ],
    weakness: "Limited operational experience — untested in active crises",
    personality:
      "Policy-focused, reform-minded, and civilian in outlook. Will resist military-led solutions. Thinks in terms of systems and long-term change rather than immediate operational results.",
    hidden: true, // conflict: consulting relationship with a private prison company
    avatarSeed: "silva_a",
  },

  // ECONOMIC ADVISOR — 4 candidates, show 3
  {
    id: "mendes",
    role: "economic",
    name: "Dr. Beatriz Mendes",
    age: 54,
    title: "Former Board Member, Banco Central do Brasil",
    background:
      "Spent twenty years at the Central Bank, including six years on the monetary policy committee. Orthodox in her economics — she believes inflation is the primary enemy of sustainable growth and that fiscal discipline is non-negotiable. Markets trust her implicitly, which is both an asset and a constraint.\n\nMendes will push back hard on spending proposals and will not soften her assessments for political convenience. She has made enemies in Congress by publicly contradicting government economic projections on three separate occasions. She was right each time.",
    strengths: ["Market credibility", "Inflation expertise", "Fiscal discipline"],
    weakness:
      "Politically tone-deaf — will say the economically correct thing at the wrong moment",
    personality:
      "Cautious, data-driven, and fiscally conservative. Speaks in precise numbers. Will qualify every statement and flag every risk. Resistant to spending proposals.",
    hidden: false,
    avatarSeed: "mendes",
  },
  {
    id: "salavea",
    role: "economic",
    name: "Prof. Eduardo Salave'a",
    age: 49,
    title: "Former Senior Economist, World Bank",
    background:
      "Twelve years at the World Bank working on development economics across Latin America and Sub-Saharan Africa before returning to Brazil to advise three successive governments. He believes that market orthodoxy alone cannot address Brazil's structural inequality and that targeted state investment in infrastructure, education, and industrial policy is economically sound — not just politically convenient.\n\nSalave'a will consistently argue for investment over austerity and will clash directly with fiscal conservatives. His international networks are exceptional and he is respected in development economics circles globally.",
    strengths: [
      "Development economics expertise",
      "International networks",
      "Industrial policy knowledge",
    ],
    weakness: "Underestimates inflationary risks of deficit spending",
    personality:
      "Intellectually confident and internationally minded. Believes in the state as an economic actor. Will argue for investment and push back against austerity. Occasionally dismissive of political constraints.",
    hidden: false,
    avatarSeed: "salavea",
  },
  {
    id: "ferreira_al",
    role: "economic",
    name: "Ana Luísa Ferreira",
    age: 44,
    title: "Former Partner, McKinsey; Public Sector Reform Director",
    background:
      "Ten years at McKinsey advising governments and major corporations before moving entirely into public sector reform. She has redesigned procurement systems, restructured state-owned enterprises, and led the efficiency programme at the Ministry of Infrastructure that delivered 23% cost reductions without cutting services.\n\nFerreira is ideologically flexible — she will argue for whatever the data supports rather than defending an economic doctrine. This makes her uniquely valuable in coalition governments where she can find common ground between competing economic factions. Some see this flexibility as pragmatism; others as a lack of principle.",
    strengths: [
      "Operational efficiency",
      "Cross-ideological credibility",
      "Public sector reform expertise",
    ],
    weakness: "May lack the conviction to defend unpopular but necessary policies",
    personality:
      "Pragmatic, data-driven, and efficiency-focused. No strong ideological commitments. Excellent at finding workable compromises. Will present options rather than pushing hard for one answer.",
    hidden: true, // conflict: maintains advisory relationship with three major contractors
    avatarSeed: "ferreira_al",
  },
  {
    id: "costa_r",
    role: "economic",
    name: "Dr. Ricardo Costa",
    age: 61,
    title: "Former Finance Minister (2011-2014)",
    background:
      "Served as Finance Minister for three years during a period of strong growth, overseeing Brazil's peak investment grade rating and the country's most successful FDI decade. Has been in the private sector since, advising pension funds and sovereign wealth funds. His experience at the highest level of economic governance is unmatched in the current field.\n\nCosta is old-school in his methods — he prefers phone calls to memos and relationships to institutions. His network across global finance is extraordinary. He is also 61 and set in his ways, and the economic landscape has changed significantly since his tenure.",
    strengths: [
      "Unmatched senior government experience",
      "Global finance relationships",
      "Investment grade credibility",
    ],
    weakness: "Methods and thinking may be a decade out of date",
    personality:
      "Experienced, confident, and relationship-focused. Thinks in terms of big deals and bilateral agreements rather than policy mechanisms. Will draw on historical precedent constantly.",
    hidden: false,
    avatarSeed: "costa_r",
  },

  // FOREIGN MINISTER — 3 candidates, show all 3
  {
    id: "leal",
    role: "foreign",
    name: "Ambassador Sofia Leal",
    age: 61,
    title: "Former Ambassador to the European Union and United States",
    background:
      "Thirty-five years in Itamaraty — Brazil's foreign service — culminating in ambassadorial postings to Brussels and Washington simultaneously. She is the most experienced diplomat available and her relationships with European and American counterparts are genuinely irreplaceable. She thinks in decades, not turns.\n\nLeal is a multilateralist who believes in institutions, treaties, and patient relationship-building. She will consistently advise caution, consultation, and process. In a slow-moving crisis this is an asset; in a fast-moving one it can be a liability.",
    strengths: [
      "Unmatched diplomatic experience",
      "EU and US relationships",
      "Long-term strategic thinking",
    ],
    weakness: "Slow to act — will recommend consultation when speed is needed",
    personality:
      "Eloquent, measured, and deeply experienced. Thinks in relationships and long-term positioning. Will be slightly evasive about difficult bilateral situations. Favours multilateral approaches.",
    hidden: false,
    avatarSeed: "leal",
  },
  {
    id: "nakamura",
    role: "foreign",
    name: "Dr. Paulo Nakamura",
    age: 52,
    title: "Former Chief Trade Negotiator, Ministry of Economy",
    background:
      "Led Brazil's trade negotiating team for twelve years, personally negotiating fourteen bilateral agreements including the preliminary Mercosul-EU framework. He is transactional by nature and training — he sees diplomatic relationships primarily as the context for economic deals rather than ends in themselves.\n\nNakamura's commercial instincts are exceptional. His political instincts are weaker. He will consistently push for trade agreements and investment deals and may underweight the diplomatic relationship costs of purely commercial decisions.",
    strengths: ["Trade negotiation expertise", "Commercial network", "Deal-closing ability"],
    weakness: "Treats political relationships as instruments rather than assets",
    personality:
      "Transactional, commercially-focused, and deal-oriented. Sees diplomacy as the context for economic agreements. Will push for trade deals and investment frameworks. Weaker on purely political relationship management.",
    hidden: false,
    avatarSeed: "nakamura",
  },
  {
    id: "vasconcelos",
    role: "foreign",
    name: "Dra. Camila Vasconcelos",
    age: 48,
    title: "Former Human Rights Commissioner, United Nations",
    background:
      "Spent fifteen years at the UN Human Rights Commission before returning to Brazil as a diplomat. She brings a genuinely different perspective to foreign policy — she believes Brazil's greatest diplomatic asset is its potential to be a credible voice for the Global South on human rights and democratic governance.\n\nVasconcelos will consistently push for Brazil to take principled positions even when they are commercially or diplomatically costly. She is deeply respected in multilateral institutions and civil society networks globally. Traditional foreign policy establishments view her as idealistic.",
    strengths: [
      "Multilateral institution relationships",
      "Global South credibility",
      "Soft power expertise",
    ],
    weakness:
      "Will prioritise values over commercial interests in ways that create economic costs",
    personality:
      "Principled, multilateralist, and values-driven. Believes Brazil should lead by example on human rights and governance. Will push for principled positions even when commercially inconvenient.",
    hidden: true, // conflict: maintains relationships with foreign NGOs that occasionally clash with Brazilian government positions
    avatarSeed: "vasconcelos",
  },

  // SOCIAL INTEGRATION MINISTER — 4 candidates, show 3
  {
    id: "drummond",
    role: "social",
    name: "Prof. Carlos Drummond",
    age: 56,
    title: "Sociologist; Former Bolsa Família Policy Director",
    background:
      "The intellectual architect of Brazil's most successful social programme redesign, Drummond spent twenty years studying inequality and poverty before moving into policy. He speaks about social issues through human stories rather than statistics — which makes him extraordinarily effective in public communication and occasionally frustrating in budget negotiations.\n\nDrummond is genuinely idealistic in a way that is either inspiring or naive depending on the situation. He will consistently advocate for the most marginalised communities and will not soften his assessments of policies he believes will harm them.",
    strengths: ["Social programme design", "Community credibility", "Public communication"],
    weakness:
      "Underestimates fiscal constraints — will push for programmes the budget cannot support",
    personality:
      "Idealistic, passionate, and community-focused. Speaks in human stories. Will consistently advocate for the poor and marginalised. Sometimes accused of being naive about political and fiscal realities.",
    hidden: false,
    avatarSeed: "drummond",
  },
  {
    id: "alencar",
    role: "social",
    name: "Dr. Juliana Alencar",
    age: 43,
    title: "Public Health Director; Former WHO Consultant",
    background:
      "A medical doctor who moved into public health policy after fifteen years practicing in the SUS system in the Northeast. She brings a clinical approach to social policy — evidence-based, outcome-focused, and resistant to programmes that feel good but lack demonstrated effectiveness.\n\nAlencar's greatest strength is her credibility with both the public health community and international health organisations. Her weakness is that she sometimes struggles to communicate the human significance of her work to political audiences who respond better to stories than statistics.",
    strengths: [
      "Healthcare system expertise",
      "Evidence-based policy approach",
      "International health networks",
    ],
    weakness: "Struggles to communicate policy importance to political audiences",
    personality:
      "Evidence-driven, practical, and outcomes-focused. Will always ask for the data. Resists programmes without demonstrated effectiveness. Excellent on healthcare, strong on other social metrics.",
    hidden: false,
    avatarSeed: "alencar",
  },
  {
    id: "pires",
    role: "social",
    name: "Marcos Pires",
    age: 50,
    title: "Former Community Leader; Federal Housing Administrator",
    background:
      "Grew up in Complexo do Alemão and spent fifteen years leading the community association before being appointed to a federal housing role where he oversaw the most successful informal settlement regularisation programme in Rio's history. He has never held a senior government position and is not a natural bureaucrat, but his credibility with the communities the government most needs to reach is unmatched by anyone in public life.\n\nPires understands from direct experience what government programmes look like from the receiving end. He will consistently tell the President when a policy that sounds good in Brasília will fail in the favela.",
    strengths: [
      "Grassroots community credibility",
      "Ground-level policy reality check",
      "Informal settlement expertise",
    ],
    weakness: "Limited bureaucratic experience — will struggle with large institutional management",
    personality:
      "Direct, grounded, and community-focused. Speaks from lived experience. Will flag when policies sound good in theory but will fail in practice. Less comfortable with bureaucratic process than with community engagement.",
    hidden: false,
    avatarSeed: "pires",
  },
  {
    id: "oliveira_s",
    role: "social",
    name: "Senadora Sandra Oliveira",
    age: 55,
    title: "Former Senator; Chair, Social Affairs Committee",
    background:
      "Three terms in the Senate chairing the Social Affairs Committee, during which she passed eleven pieces of legislation affecting welfare, housing, and education. Oliveira is the most politically experienced social minister candidate — she knows how to get things done in Congress in ways that academic and community candidates do not.\n\nShe is also the most politically calculating of the four candidates. Her advocacy for social programmes is genuine but filtered through a constant awareness of what is achievable and what will play well in an election year. Some see this as wisdom; others as a compromised version of social advocacy.",
    strengths: [
      "Congressional relationships",
      "Legislative track record",
      "Political pragmatism",
    ],
    weakness: "Will subordinate social policy ambition to political calculation",
    personality:
      "Politically experienced and pragmatic. Knows how to get legislation passed. Will consistently filter social policy recommendations through political viability. Effective but calculating.",
    hidden: true, // conflict: maintains relationships with construction lobby that benefits from housing programmes
    avatarSeed: "oliveira_s",
  },

  // CHIEF OF STAFF — 3 candidates, show all 3
  {
    id: "rocha",
    role: "chief_of_staff",
    name: "Fernanda Rocha",
    age: 46,
    title: "Political Strategist; Former Congressional Chief of Staff",
    background:
      "Fifteen years managing congressional relationships for three successive governments, including two that survived no-confidence votes that should have ended them. Rocha is widely considered the most effective political operator of her generation — she understands congressional arithmetic, party dynamics, and the informal relationships that determine what actually passes.\n\nShe is also intensely focused on political survival. Her advice is consistently excellent at keeping governments in power. Whether it is equally excellent at producing good governance is a question that her clients have occasionally had reason to ask.",
    strengths: [
      "Congressional arithmetic mastery",
      "Political crisis management",
      "Coalition maintenance",
    ],
    weakness: "Prioritises political survival over national interest when the two conflict",
    personality:
      "Sharp, political, and pragmatic. Thinks about coalitions and congressional arithmetic. Advice subtly prioritises short-term political survival over long-term national interest. Frames politically convenient advice as pragmatic necessity.",
    hidden: true, // the original hidden agenda advisor
    avatarSeed: "rocha",
  },
  {
    id: "monteiro",
    role: "chief_of_staff",
    name: "Gabriel Monteiro",
    age: 51,
    title: "Former Congressional Leader; Party Whip",
    background:
      "Served as congressional leader for the largest centrist party for eight years, developing the deepest cross-party relationships in the current political field. Monteiro is the person that other politicians call when they need something done quietly. He expects reciprocity — he will get things done, but he keeps a careful ledger.\n\nHis effectiveness is real and his network is irreplaceable. The question every President has to ask is whether the debts accumulated in using that network are worth the results it delivers.",
    strengths: [
      "Cross-party relationships",
      "Informal political networks",
      "Deal-making ability",
    ],
    weakness: "Transactional — will accumulate political debts that eventually come due",
    personality:
      "Relationship-focused and transactional. Gets things done through favours and reciprocity. Will consistently identify the political deal that makes something possible. Expects political capital to be repaid.",
    hidden: false,
    avatarSeed: "monteiro",
  },
  {
    id: "correia",
    role: "chief_of_staff",
    name: "Dr. Isabel Correia",
    age: 39,
    title: "Former Government Reform Director; Academic",
    background:
      "Oxford-trained political scientist who spent five years redesigning the federal government's internal coordination systems before being appointed to lead the Government Reform Office. She is the youngest candidate for any role and the least politically experienced. She is also the most genuinely trustworthy.\n\nCorreia will give the President honest assessments even when they are unwelcome. She will not manage information for political convenience. Her advice is principled and her implementation is excellent. Her weakness is that she sometimes lacks the political instincts to know when honesty needs to be timed carefully.",
    strengths: [
      "Genuine trustworthiness",
      "Implementation excellence",
      "Principled advice",
    ],
    weakness: "Limited political experience — may misread the room in sensitive situations",
    personality:
      "Principled, organised, and genuinely honest. Will give accurate assessments without political filtering. Excellent at implementation. Less experienced at navigating political complexity.",
    hidden: false,
    avatarSeed: "correia",
  },
];

export const ADVISOR_ROLES: AdvisorRole[] = [
  "security",
  "economic",
  "foreign",
  "social",
  "chief_of_staff",
];

export const ADVISOR_ROLE_LABELS: Record<AdvisorRole, string> = {
  security: "Security & Defence Advisor",
  economic: "Economic Advisor",
  foreign: "Foreign Minister",
  social: "Social Integration Minister",
  chief_of_staff: "Chief of Staff",
};

export function candidatesForRole(role: AdvisorRole): AdvisorCandidate[] {
  return ADVISOR_CANDIDATES.filter((c) => c.role === role);
}

/** Small deterministic PRNG (mulberry32) so a given seed always produces the same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * For roles with more candidates than display slots, picks which subset to
 * show this campaign. Seeded from the campaign creation timestamp so it's
 * deterministic per-campaign, and uses a modulo rotation on the seed so the
 * excluded candidate can't repeat more than twice in a row.
 */
export function pickCandidatePool(
  role: AdvisorRole,
  seed: number,
  displaySlots: number
): AdvisorCandidate[] {
  const pool = candidatesForRole(role);
  if (pool.length <= displaySlots) return pool;

  const excludeCount = pool.length - displaySlots;
  // Rotate the exclusion start point using the seed so consecutive campaigns
  // (whose Date.now() seeds are monotonically increasing) don't land on the
  // same excluded candidate more than twice running.
  const rotation = Math.floor(seed / 1000) % pool.length;
  const rand = mulberry32(seed + rotation);
  const shuffled = seededShuffle(pool, rand);
  return shuffled.slice(0, pool.length - excludeCount);
}

export interface AdvisorPoolSelection {
  role: AdvisorRole;
  candidates: AdvisorCandidate[];
}

const DISPLAY_SLOTS: Record<AdvisorRole, number> = {
  security: 3,
  economic: 3,
  foreign: 3,
  social: 3,
  chief_of_staff: 3,
};

/** Builds the full candidate pool set for a new campaign, seeded by creation time. */
export function buildAdvisorPools(seed: number = Date.now()): AdvisorPoolSelection[] {
  return ADVISOR_ROLES.map((role) => ({
    role,
    candidates: pickCandidatePool(role, seed, DISPLAY_SLOTS[role]),
  }));
}

export function findCandidateById(id: string): AdvisorCandidate | undefined {
  return ADVISOR_CANDIDATES.find((c) => c.id === id);
}
