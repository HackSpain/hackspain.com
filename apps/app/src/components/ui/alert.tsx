import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full border-[3px] px-3 py-2.5 text-left text-sm",
  {
    variants: {
      variant: {
        default: "border-hs-navy bg-hs-slate/20",
        error: "border-hs-red bg-hs-red/10",
        success: "border-hs-teal bg-hs-teal/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm text-hs-brown", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription };
