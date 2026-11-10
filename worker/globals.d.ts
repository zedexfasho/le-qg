// `process` n'existe pas dans le Worker : déclaré uniquement pour data/site.ts qui le teste avec `typeof`.
// eslint-disable-next-line no-var
declare var process: { env: Record<string, string | undefined> };
