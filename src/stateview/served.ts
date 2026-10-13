/**
 * Whether the review routes are served: always in development and on preview
 * deployments, and on a Vercel production deployment only with STATEVIEW=1.
 * The generated routes call this, under either router.
 */
export function reviewRoutesServed() {
  return process.env.VERCEL_ENV !== "production" || process.env.STATEVIEW === "1";
}
