import { createFileRoute } from "@tanstack/react-router";
import { DashboardGargalos } from "./_app.index";

export const Route = createFileRoute("/_app/pitstop")({
  component: DashboardGargalos,
  head: () => ({ meta: [{ title: "Monitor PitStop — Controller CS" }] }),
});
