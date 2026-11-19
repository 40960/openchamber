import { describe, expect, it } from 'vitest';

import { createChatsScope, CHATS_SCOPE_PUBLIC_ID } from './chats-scope.js';
import { createReadSessionDefaults, resolveSessionDefaults } from './session-defaults.js';

describe('createReadSessionDefaults', () => {
  const chatsScope = createChatsScope('/home/me/.openchamber/chats');
  const settings = {
    defaultModel: 'anthropic/claude-sonnet-5', defaultVariant: 'high', defaultAgent: 'build',
    chatsDefaultModel: 'openai/gpt-6', chatsDefaultVariant: 'low', chatsDefaultAgent: 'plan',
    projects: [{ id: 'proj', defaultModel: 'google/gemini-4', defaultAgent: 'review' }],
  };
  const readFor = (current) => createReadSessionDefaults({
    readSettings: async () => current,
    sanitizeProjects: (projects) => projects,
    chatsScopeID: chatsScope.id,
  });

  it('reads the Chats defaults for the Chats storage id, which is what scheduled runs pass', async () => {
    expect(await readFor(settings)(chatsScope.id))
      .toEqual({ providerID: 'openai', modelID: 'gpt-6', variant: 'low', agent: 'plan' });
    expect(chatsScope.toStorageID(CHATS_SCOPE_PUBLIC_ID)).toBe(chatsScope.id);
  });

  it('falls back to the global defaults for an empty Chats field, and reads a project by its id', async () => {
    const empty = { ...settings, chatsDefaultModel: '', chatsDefaultVariant: '', chatsDefaultAgent: '' };
    expect(await readFor(empty)(chatsScope.id))
      .toEqual({ providerID: 'anthropic', modelID: 'claude-sonnet-5', variant: 'high', agent: 'build' });
    expect(await readFor(settings)('proj'))
      .toEqual({ providerID: 'google', modelID: 'gemini-4', variant: null, agent: 'review' });
    expect(await readFor(settings)('unknown'))
      .toEqual({ providerID: 'anthropic', modelID: 'claude-sonnet-5', variant: 'high', agent: 'build' });
  });
});

describe('resolveSessionDefaults', () => {
  it('prefers the project default, then the global one, keeping each variant with its model', () => {
    const settings = { defaultModel: 'anthropic/claude-sonnet-5', defaultVariant: 'high', defaultAgent: 'build' };
    expect(resolveSessionDefaults({ settings, project: { defaultModel: 'openai/gpt-6', defaultAgent: 'plan' } }))
      .toEqual({ providerID: 'openai', modelID: 'gpt-6', variant: null, agent: 'plan' });
    expect(resolveSessionDefaults({ settings, project: {} }))
      .toEqual({ providerID: 'anthropic', modelID: 'claude-sonnet-5', variant: 'high', agent: 'build' });
  });

  it('leaves everything to OpenCode when nothing is set', () => {
    expect(resolveSessionDefaults({ settings: {}, project: null }))
      .toEqual({ providerID: null, modelID: null, variant: null, agent: null });
    expect(resolveSessionDefaults({ settings: { defaultModel: 'no-slash' }, project: null }).modelID).toBeNull();
  });
});
