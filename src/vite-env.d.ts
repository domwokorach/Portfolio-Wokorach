/// <reference types="vite/client" />

import type { AttributifyAttributes } from "@unocss/preset-attributify";

// UnoCSS attributify typings for React.
// We omit keys that clash with React's own props or with component prop types.
// `border` is omitted because TableHTMLAttributes<T> defines it as `number`,
// which conflicts with attributify's `string | boolean`.
type SafeAttributifyAttributes = Omit<
  AttributifyAttributes,
  "size" | "children" | "color" | "border"
>;

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLAttributes<T> extends SafeAttributifyAttributes {}
}
