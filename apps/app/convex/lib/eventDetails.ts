export function parseEventDetails(args: {
  dietaryRestrictions: string;
  dietaryDetails?: string;
  travelOrigin: string;
}): {
  dietaryRestrictions: string;
  dietaryDetails: string | undefined;
  travelOrigin: string;
} {
  const dietaryRestrictions = args.dietaryRestrictions.trim();
  if (!dietaryRestrictions) {
    throw new Error("Add dietary restrictions, or write None");
  }
  const travelOrigin = args.travelOrigin.trim();
  if (!travelOrigin) {
    throw new Error("Tell us where you travel from");
  }
  const dietaryDetails = args.dietaryDetails?.trim();
  return {
    dietaryRestrictions,
    dietaryDetails: dietaryDetails ? dietaryDetails : undefined,
    travelOrigin,
  };
}
