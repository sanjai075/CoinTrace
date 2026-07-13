import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack/server";

export default async function Handler(props: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Await the promises to resolve parameters safely for Next.js 15
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const resolvedProps = {
    params: resolvedParams,
    searchParams: resolvedSearchParams,
  };

  return (
    <StackHandler
      app={stackServerApp}
      routeProps={resolvedProps}
      fullPage={true}
    />
  );
}
