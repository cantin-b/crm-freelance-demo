import type { Language } from "./constants";

export type CategoryGroupKey =
  | "building_renovation"
  | "automotive"
  | "home_services"
  | "professional_services"
  | "local_commerce"
  | "other";

export interface ClassifiedProspectCategory {
  raw: string;
  groupKey: CategoryGroupKey;
  label: string;
  groupLabel: string;
  recognized: boolean;
}

export interface GroupedProspectCategories {
  groupKey: CategoryGroupKey;
  groupLabel: string;
  categories: ClassifiedProspectCategory[];
}

interface CategoryGroupRule {
  groupKey: Exclude<CategoryGroupKey, "other">;
  aliases: string[];
  examples: Record<Language, string[]>;
  patterns: RegExp[];
}

const GROUP_LABELS: Record<CategoryGroupKey, Record<Language, string>> = {
  building_renovation: { en: "Building & renovation", fr: "Bâtiment & rénovation" },
  automotive: { en: "Automotive", fr: "Automobile" },
  home_services: { en: "Home services", fr: "Services maison" },
  professional_services: { en: "Professional services", fr: "Services professionnels" },
  local_commerce: { en: "Local commerce", fr: "Commerce local" },
  other: { en: "Other", fr: "Autre" },
};

const GROUP_RULES: CategoryGroupRule[] = [
  {
    groupKey: "building_renovation",
    aliases: [
      "Peintre en bâtiment",
      "Entreprise de peinture",
      "Magasin de peinture",
      "Plombier",
      "Plomberie",
      "Électricien",
      "Electricien",
      "Entreprise d'électricité",
      "Couvreur",
      "Toiture",
      "Plâtrier",
      "Platrier",
      "Plafonneur",
      "Gypserie",
      "Carreleur",
      "Carrelage",
      "Entrepreneur spécialisé dans les revêtements de sol",
      "Revêtement de sol",
      "Entreprise de construction",
      "Constructeur immobilier",
      "Menuisier",
      "Menuiserie",
      "Maçonnerie",
      "Maconnerie",
      "Maçon",
      "Painting contractor",
      "Painter",
      "Paint store",
      "Plumbing service",
      "Plumber",
      "Electrician",
      "Electrical contractor",
      "Roofing contractor",
      "Roofer",
      "Plasterer",
      "Tile contractor",
      "Tiler",
      "Flooring contractor",
      "Construction company",
      "Carpenter",
      "Mason",
      "Masonry contractor",
    ],
    examples: {
      en: ["Painting contractor", "Construction company", "Roofer", "Flooring contractor"],
      fr: ["Peintre en bâtiment", "Entreprise de construction", "Couvreur", "Revêtement de sol"],
    },
    patterns: [
      /\bpeint(?:re|ure)\b/,
      /\bpaint(?:er|ing| store)\b/,
      /\bplomb(?:ier|erie)\b/,
      /\bplumb(?:er|ing)\b/,
      /\belectricien\b/,
      /\belectricite\b/,
      /\belectrician\b/,
      /\belectrical contractor\b/,
      /\bcouvreur\b/,
      /\btoiture\b/,
      /\broof(?:er|ing)\b/,
      /\bplatrier\b/,
      /\bplafonneur\b/,
      /\bgypserie\b/,
      /\bplasterer\b/,
      /\bcarrel(?:eur|age)\b/,
      /\btile contractor\b/,
      /\btiler\b/,
      /\brevetements? (?:de|des) sols?\b/,
      /\bflooring\b/,
      /\bentreprise de construction\b/,
      /\bconstructeur immobilier\b/,
      /\bconstruction company\b/,
      /\bmenuis(?:ier|erie)\b/,
      /\bcarpenter\b/,
      /\bmacon(?:nerie)?\b/,
      /\bmason(?:ry)?\b/,
    ],
  },
  {
    groupKey: "automotive",
    aliases: [
      "Garage automobile",
      "Garage",
      "Atelier de carrosserie automobile",
      "Carrosserie",
      "Mécanicien",
      "Mecanicien",
      "Pneus",
      "Service de pneus",
      "Auto repair shop",
      "Car repair garage",
      "Auto body shop",
      "Mechanic",
      "Tire shop",
      "Tire service",
    ],
    examples: {
      en: ["Auto repair shop", "Auto body shop", "Mechanic", "Tire service"],
      fr: ["Garage automobile", "Carrosserie", "Mécanicien", "Service de pneus"],
    },
    patterns: [
      /\bgarage automobile\b/,
      /\bauto repair\b/,
      /\bcar repair\b/,
      /\bcarrosserie\b/,
      /\bauto body\b/,
      /\bmecanicien\b/,
      /\bmechanic\b/,
      /\bpneus?\b/,
      /\btire (?:shop|service)\b/,
    ],
  },
  {
    groupKey: "home_services",
    aliases: [
      "Chauffage",
      "Climatisation",
      "Ventilation",
      "Jardinier",
      "Paysagiste",
      "Nettoyage",
      "Entreprise de nettoyage",
      "HVAC contractor",
      "Heating contractor",
      "Landscaper",
      "Landscape gardener",
      "Cleaning service",
    ],
    examples: {
      en: ["HVAC contractor", "Landscaper", "Cleaning service"],
      fr: ["Chauffage", "Paysagiste", "Nettoyage"],
    },
    patterns: [
      /\bchauffage\b/,
      /\bclimatisation\b/,
      /\bventilation\b/,
      /\bhvac\b/,
      /\bheating contractor\b/,
      /\bjardinier\b/,
      /\bpaysagiste\b/,
      /\blandscap(?:er|ing)\b/,
      /\bnettoyage\b/,
      /\bcleaning service\b/,
    ],
  },
  {
    groupKey: "professional_services",
    aliases: [
      "Consultant en ressources humaines",
      "Consultant RH",
      "Ressources humaines",
      "Comptable",
      "Fiduciaire",
      "Architecte",
      "Agence immobilière",
      "Agence immobiliere",
      "HR consultant",
      "Accountant",
      "Architect",
      "Real estate agency",
    ],
    examples: {
      en: ["HR consultant", "Accountant", "Architect", "Real estate agency"],
      fr: ["Consultant RH", "Comptable", "Architecte", "Agence immobilière"],
    },
    patterns: [
      /\bressources humaines\b/,
      /\bconsultant rh\b/,
      /\bhr consultant\b/,
      /\bcomptable\b/,
      /\bfiduciaire\b/,
      /\baccountant\b/,
      /\barchitecte\b/,
      /\barchitect\b/,
      /\bagence immobiliere\b/,
      /\breal estate agency\b/,
    ],
  },
  {
    groupKey: "local_commerce",
    aliases: [
      "Restaurant",
      "Boulangerie",
      "Salon de coiffure",
      "Coiffeur",
      "Bakery",
      "Hair salon",
    ],
    examples: {
      en: ["Restaurant", "Bakery", "Hair salon"],
      fr: ["Restaurant", "Boulangerie", "Salon de coiffure"],
    },
    patterns: [
      /\brestaurant\b/,
      /\bboulangerie\b/,
      /\bbakery\b/,
      /\bcoiff(?:eur|ure)\b/,
      /\bhair salon\b/,
    ],
  },
];

const GROUP_ORDER: CategoryGroupKey[] = [
  "building_renovation",
  "automotive",
  "home_services",
  "professional_services",
  "local_commerce",
  "other",
];

function normalizeCategory(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_INDEX = new Map<string, CategoryGroupRule>();
for (const rule of GROUP_RULES) {
  for (const alias of rule.aliases) {
    ALIAS_INDEX.set(normalizeCategory(alias), rule);
  }
}

function getGroupLabel(groupKey: CategoryGroupKey, language: Language): string {
  return GROUP_LABELS[groupKey][language];
}

function findGroupRule(raw: string): CategoryGroupRule | null {
  const normalized = normalizeCategory(raw);
  const exact = ALIAS_INDEX.get(normalized);
  if (exact) return exact;

  return GROUP_RULES.find(rule =>
    rule.patterns.some(pattern => pattern.test(normalized))
  ) ?? null;
}

export function classifyProspectCategory(raw: string | null | undefined, language: Language = "en"): ClassifiedProspectCategory {
  const cleaned = raw?.trim() || "";
  const rule = cleaned ? findGroupRule(cleaned) : null;
  const groupKey = rule?.groupKey ?? "other";

  return {
    raw: cleaned,
    groupKey,
    label: cleaned,
    groupLabel: getGroupLabel(groupKey, language),
    recognized: Boolean(rule),
  };
}

export function groupRawCategories(rawCategories: string[], language: Language = "en"): GroupedProspectCategories[] {
  const byRaw = new Map<string, ClassifiedProspectCategory>();
  for (const raw of rawCategories) {
    const cleaned = raw.trim();
    if (!cleaned || byRaw.has(cleaned)) continue;
    byRaw.set(cleaned, classifyProspectCategory(cleaned, language));
  }

  const grouped = new Map<CategoryGroupKey, ClassifiedProspectCategory[]>();
  for (const category of byRaw.values()) {
    const items = grouped.get(category.groupKey) ?? [];
    items.push(category);
    grouped.set(category.groupKey, items);
  }

  return GROUP_ORDER
    .map(groupKey => ({
      groupKey,
      groupLabel: getGroupLabel(groupKey, language),
      categories: (grouped.get(groupKey) ?? []).sort((a, b) =>
        a.raw.localeCompare(b.raw, language)
      ),
    }))
    .filter(group => group.categories.length > 0);
}

export function getRecommendedCategoryGroups(language: Language = "en"): GroupedProspectCategories[] {
  return GROUP_ORDER
    .filter((groupKey): groupKey is Exclude<CategoryGroupKey, "other"> => groupKey !== "other")
    .map(groupKey => {
      const examples = GROUP_RULES
        .filter(rule => rule.groupKey === groupKey)
        .flatMap(rule => rule.examples[language]);

      return {
        groupKey,
        groupLabel: getGroupLabel(groupKey, language),
        categories: [...new Set(examples)]
          .map(example => classifyProspectCategory(example, language))
          .sort((a, b) => a.raw.localeCompare(b.raw, language)),
      };
    })
    .filter(group => group.categories.length > 0);
}
