type ClassLike = {
  id?: string;
  name?: string | null;
  created_at?: string | null;
};

export const CLASS_SEQUENCE_LABELS = [
  "P.G",
   "Nursery",
   "Prep",
  "1",
  "2",
  "3",
  "4",
  "5", 
  "6",
  "7",
  "8",
  "Pre 9th",
  "9",
  "1",
  "1st Year",
  "2nd Year",
  "B.A",
  "B.Sc",
];

const CLASS_SEQUENCE_MAP = new Map(
  CLASS_SEQUENCE_LABELS.map((label, index) => [label.toLowerCase(), index]),
);

const normalizeClassName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ").replace(/\./g, ".");

const getClassOrder = (name: string) => {
  const normalized = normalizeClassName(name);
  if (CLASS_SEQUENCE_MAP.has(normalized)) {
    return CLASS_SEQUENCE_MAP.get(normalized) as number;
  }

  const numericMatch = normalized.match(/^(?:class\s*)?(\d{1,2})$/);
  if (numericMatch) {
    const grade = Number(numericMatch[1]);
    if (grade >= 1 && grade <= 5) return 1 + grade;
    if (grade >= 6 && grade <= 8) return 3 + grade;
    if (grade === 9) return 13;
    if (grade === 10) return 14;
  }

  const ordinalMatch = normalized.match(/^(?:class\s*)?(\d{1,2})(st|nd|rd|th)$/);
  if (ordinalMatch) {
    const grade = Number(ordinalMatch[1]);
    if (grade >= 1 && grade <= 5) return 1 + grade;
    if (grade >= 6 && grade <= 8) return 3 + grade;
    if (grade === 9) return 13;
    if (grade === 10) return 14;
  }

  if (
    normalized === "pre 9th" ||
    normalized === "pre 9" ||
    normalized === "pre9" ||
    normalized === "pre-9"
  ) {
    return 12;
  }

  if (normalized === "1st year" || normalized === "first year") return 15;
  if (normalized === "2nd year" || normalized === "second year") return 16;
  if (normalized === "kg" || normalized === "k.g") return 8;

  return Number.MAX_SAFE_INTEGER;
};

export function sortClassesBySequence<T extends ClassLike>(classes: T[]): T[] {
  return [...classes].sort((left, right) => {
    const leftOrder = getClassOrder(String(left?.name || ""));
    const rightOrder = getClassOrder(String(right?.name || ""));

    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    const leftCreated = new Date(left?.created_at || 0).getTime();
    const rightCreated = new Date(right?.created_at || 0).getTime();
    return rightCreated - leftCreated;
  });
}
