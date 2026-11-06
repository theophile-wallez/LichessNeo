// The project's repository on GitHub, where its docs and example pack are.

export const REPOSITORY_URL = 'https://github.com/theophile-wallez/LichessNeo';

/** A file or folder of the repository's main branch, as GitHub shows it. */
export const repositoryPage = (path: string): string => `${REPOSITORY_URL}/blob/main/${path}`;
