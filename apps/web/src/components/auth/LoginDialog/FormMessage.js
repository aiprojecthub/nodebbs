export function FormMessage({ error, success }) {
  if (!error && !success) return null;

  if (error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
        {error}
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-900">
        {success}
      </div>
    );
  }

  return null;
}
