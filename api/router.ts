import { createRouter, publicQuery } from "./middleware";
import { loanRouter } from "./loanRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  loan: loanRouter,
});

export type AppRouter = typeof appRouter;
