/** Public asset path honouring Vite's `base` (sub-path deployments). */
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
