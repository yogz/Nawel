export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} o`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} Ko`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}
