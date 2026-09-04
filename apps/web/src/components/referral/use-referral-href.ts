import { useEffect, useMemo, useState } from "react";
import {
  appendReferralToInternalHref,
  captureReferralFromLocation,
  getStoredReferralCode,
} from "../../lib/referral-code";

function useStoredReferralCode(): string | null {
  const [code, setCode] = useState<string | null>(() =>
    typeof window === "undefined" ? null : getStoredReferralCode()
  );

  useEffect(() => {
    const captured = captureReferralFromLocation();
    setCode(captured ?? getStoredReferralCode());
  }, []);

  return code;
}

export function useReferralAwareHref(href: string): string {
  const code = useStoredReferralCode();
  return useMemo(
    () =>
      typeof window === "undefined"
        ? href
        : appendReferralToInternalHref(href, code),
    [href, code]
  );
}
