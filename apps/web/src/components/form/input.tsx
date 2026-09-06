import type { ComponentPropsWithoutRef, Ref } from "react";
import { hsControlBaseClass } from "./field-classes";

export type InputProps = ComponentPropsWithoutRef<"input">;

export const Input = function Input({
  className,
  ref,
  ...props
}: InputProps & { ref?: Ref<HTMLInputElement | null> }) {
  return (
    <input
      className={
        className ? `${hsControlBaseClass} ${className}` : hsControlBaseClass
      }
      ref={ref}
      {...props}
    />
  );
};
