import { readChatsDefaults } from './chats-scope.js';

export interface SessionDefaultSettings {
  defaultModel?: unknown;
  defaultVariant?: unknown;
  defaultAgent?: unknown;
}

const isString = (value: unknown): value is string => typeof value === 'string';

const splitModel = (value: SessionDefaultSettings['defaultModel']) => {
  const text = isString(value) ? value.trim() : '';
  const slash = text.indexOf('/');
  if (slash <= 0 || slash === text.length - 1) return null;
  return { providerID: text.slice(0, slash), modelID: text.slice(slash + 1) };
};

const text = (value: SessionDefaultSettings['defaultAgent']) => (isString(value) && value.trim() ? value.trim() : null);

export const resolveSessionDefaults = ({ settings, project }: {
  settings?: SessionDefaultSettings | null;
  project?: SessionDefaultSettings | null;
}) => {
  const projectModel = splitModel(project?.defaultModel);
  const globalModel = splitModel(settings?.defaultModel);
  const model = projectModel ?? globalModel;
  const variant = projectModel ? text(project?.defaultVariant) : globalModel ? text(settings?.defaultVariant) : null;
  return {
    providerID: model?.providerID ?? null,
    modelID: model?.modelID ?? null,
    variant,
    agent: text(project?.defaultAgent) ?? text(settings?.defaultAgent),
  };
};

interface ScopeDefaultSettings extends SessionDefaultSettings {
  chatsDefaultAgent?: unknown;
  chatsDefaultModel?: unknown;
  chatsDefaultVariant?: unknown;
  projects?: unknown;
}

export const createReadSessionDefaults = ({ readSettings, sanitizeProjects, chatsScopeID }: {
  readSettings: () => Promise<ScopeDefaultSettings | null | undefined>;
  sanitizeProjects: (projects: ScopeDefaultSettings['projects']) => ReadonlyArray<SessionDefaultSettings & { id: string }>;
  chatsScopeID: string;
}) => async (projectID: string) => {
  const settings = (await readSettings()) ?? null;
  const project = projectID === chatsScopeID
    ? readChatsDefaults(settings)
    : sanitizeProjects(settings?.projects || []).find((entry) => entry.id === projectID) ?? null;
  return resolveSessionDefaults({ settings, project });
};
