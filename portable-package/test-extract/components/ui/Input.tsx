import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn("ui-input", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn("ui-input min-h-[112px] resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn("ui-input", className)} {...props} />;
}
