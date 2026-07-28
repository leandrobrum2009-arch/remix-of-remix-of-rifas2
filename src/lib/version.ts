// Versão atual do código do app.
// Incremente ao publicar novas alterações e adicione uma entrada em CHANGELOG.
export const APP_VERSION = "1.0.0";

export interface ChangelogEntry {
  version: string;
  date: string; // ISO
  notes: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-07-02",
    notes: "Versão inicial com sistema de versionamento de código e banco de dados.",
  },
];