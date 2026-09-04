import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PhoneVerifyFailure =
  | "no_challenge"
  | "expired"
  | "too_many_attempts"
  | "incorrect";

export function phoneVerifyMessage(reason: PhoneVerifyFailure): string {
  switch (reason) {
    case "no_challenge":
      return "Request a phone code first";
    case "expired":
      return "That code expired. Request a new one.";
    case "too_many_attempts":
      return "Too many attempts. Request a new code.";
    case "incorrect":
      return "Incorrect code";
  }
}
