const DIETARY_LABELS: Record<string, string> = {
  vegetarian: "Vegetariana",
  vegan: "Vegana",
  gluten_free: "Sin gluten",
  lactose_free: "Sin lactosa",
  halal: "Halal",
  kosher: "Kosher",
  allergies: "Alergias",
  other: "Otra",
};

export function formatDietaryRestrictions(ids: string[] | undefined): string {
  const labels = (ids ?? [])
    .map((id) => DIETARY_LABELS[id] ?? id.trim())
    .filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "Ninguna";
}
