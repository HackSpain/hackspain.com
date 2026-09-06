import type { ComponentPropsWithoutRef, Ref } from "react";
import { hsControlBaseClass } from "./field-classes";

export type TextareaProps = ComponentPropsWithoutRef<"textarea">;

export const Textarea = function Textarea({
  className,
  ref,
  ...props
}: TextareaProps & { ref?: Ref<HTMLTextAreaElement | null> }) {
  return (
    <textarea
      className={
        className ? `${hsControlBaseClass} ${className}` : hsControlBaseClass
      }
      ref={ref}
      {...props}
    />
  );
};
