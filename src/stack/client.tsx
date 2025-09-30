import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
});

console.log("StackClientApp Initialized On Client:");
console.log("Project ID:", process.env.NEXT_PUBLIC_STACK_PROJECT_ID);
console.log("Publishable Key:", process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY);