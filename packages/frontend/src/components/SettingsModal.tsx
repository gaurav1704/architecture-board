import { useCallback } from 'react'
import { useBoardStore } from '../store/boardStore.js'

const MODEL_ENDPOINTS: Record<string, string> = {
  'gpt-4o': 'https://api.openai.com/v1',
  'gpt-4o-mini': 'https://api.openai.com/v1',
  'gpt-4-turbo': 'https://api.openai.com/v1',
  'o1': 'https://api.openai.com/v1',
  'o3-mini': 'https://api.openai.com/v1',
  'claude-sonnet-4-20250514': 'https://api.anthropic.com/v1',
  'claude-haiku-3-5-20241022': 'https://api.anthropic.com/v1',
  'gemini-2.5-pro': 'https://generativelanguage.googleapis.com/v1beta',
  'gemini-2.5-flash': 'https://generativelanguage.googleapis.com/v1beta',
  'openrouter/auto': 'https://openrouter.ai/api/v1',
  'deepseek-chat': 'https://api.deepseek.com/v1',
  'deepseek-reasoner': 'https://api.deepseek.com/v1',
  'deepseek-v4-flash': 'https://api.deepseek.com/v1',
  'opencode/deepseek-v4-flash': 'https://opencode.ai/zen/go/v1',
  'opencode/gpt-4o-mini': 'https://opencode.ai/zen/go/v1',
  'opencode/claude-sonnet-4-20250514': 'https://opencode.ai/zen/go/v1',
}

const KNOWN_MODELS = Object.keys(MODEL_ENDPOINTS)

export function SettingsModal() {
  const settingsOpen = useBoardStore((s) => s.settingsOpen)
  const toggleSettings = useBoardStore((s) => s.toggleSettings)
  const settings = useBoardStore((s) => s.ai.settings)
  const setAiSettings = useBoardStore((s) => s.setAiSettings)

  const handleModelChange = useCallback((model: string) => {
    const endpoint = MODEL_ENDPOINTS[model]
    if (endpoint) {
      setAiSettings({ ...settings, model, apiUrl: endpoint })
    } else {
      setAiSettings({ ...settings, model })
    }
  }, [settings, setAiSettings])

  if (!settingsOpen) return null

  return (
    <div className="modal-overlay" onClick={toggleSettings}>
      <div
        className="modal-content"
        style={{ width: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <h3>⚙️ AI Settings</h3>
          </div>
          <button className="modal-close" onClick={toggleSettings}>✕</button>
        </div>
        <div className="modal-body">
          <div className="config-field">
            <label>API URL</label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => {
                const val = e.target.value.replace(/^[^a-zA-Z]+/, '')
                setAiSettings({ ...settings, apiUrl: val })
              }}
              placeholder="https://api.openai.com/v1"
            />
            <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              OpenAI-compatible API endpoint
            </p>
          </div>
          <div className="config-field">
            <label>Model</label>
            <select
              value={KNOWN_MODELS.includes(settings.model) ? settings.model : '__custom__'}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <optgroup label="OpenAI">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="o1">o1</option>
                <option value="o3-mini">o3 Mini</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="claude-haiku-3-5-20241022">Claude Haiku 3.5</option>
              </optgroup>
              <optgroup label="Google">
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </optgroup>
              <optgroup label="OpenRouter / Custom">
                <option value="openrouter/auto">OpenRouter Auto</option>
                <option value="deepseek-chat">DeepSeek V3</option>
                <option value="deepseek-reasoner">DeepSeek R1</option>
                <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
              </optgroup>
              <optgroup label="Opencode">
                <option value="opencode/deepseek-v4-flash">Opencode DeepSeek V4 Flash</option>
                <option value="opencode/gpt-4o-mini">Opencode GPT-4o Mini</option>
                <option value="opencode/claude-sonnet-4-20250514">Opencode Claude Sonnet 4</option>
              </optgroup>
              <option value="__custom__">── Custom ──</option>
            </select>
            {!KNOWN_MODELS.includes(settings.model) && (
              <input
                type="text"
                value={settings.model}
                onChange={(e) => setAiSettings({ ...settings, model: e.target.value })}
                placeholder="custom-model-name"
                style={{ marginTop: 4 }}
              />
            )}
          </div>
          <div className="config-field">
            <label>API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setAiSettings({ ...settings, apiKey: e.target.value })}
              placeholder="sk-..."
            />
            <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              Stored locally in your browser. Never sent to our server.
            </p>
          </div>
          <div style={{ marginTop: 16, padding: 12, background: '#0f0f1a', borderRadius: 6, fontSize: 12, color: '#888' }}>
            <strong style={{ color: '#aaa' }}>Note:</strong> Settings are stored in your browser's localStorage.
            The API key is sent directly to the configured API endpoint and is never stored on our backend.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={toggleSettings}>Done</button>
        </div>
      </div>
    </div>
  )
}
