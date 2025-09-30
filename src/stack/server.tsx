import "server-only";

import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
});

console.log("StackServerApp Initialized On Server:");
console.log("Project ID:", process.env.NEXT_PUBLIC_STACK_PROJECT_ID);
console.log("Publishable Key:", process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY);
console.log("Secret Key Loaded:", !!process.env.STACK_SECRET_SERVER_KEY);