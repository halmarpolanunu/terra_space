"use client";

import { useState } from "react";

import { FramedPanel } from "@/components/framed-panel";
import { StatusChip } from "@/components/status-chip";
import {
  testLmStudio,
  updateSettings,
  type LmStudioTestResult,
  type Settings,
} from "@/lib/settings-api";

type LmStudioSettingsProps = {
  settings: Settings;
  onSaved?: (settings: Settings) => void;
};

export function LmStudioSettings({ settings, onSaved }: LmStudioSettingsProps) {
  const [baseUrl, setBaseUrl] = useState(settings.lm_studio_base_url);
  const [model, setModel] = useState(settings.lm_studio_model ?? "");
  const [timeoutSeconds, setTimeoutSeconds] = useState(
    settings.lm_studio_extraction_timeout_seconds,
  );
  const [models, setModels] = useState<string[]>(
    settings.lm_studio_model ? [settings.lm_studio_model] : [],
  );
  const [result, setResult] = useState<LmStudioTestResult>();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  // Keep the currently-selected model in the option list even if a fresh test
  // did not return it, so a saved choice never silently disappears.
  const modelOptions = model && !models.includes(model) ? [model, ...models] : models;

  async function runTest() {
    setTesting(true);
    setError(undefined);
    try {
      const next = await testLmStudio(baseUrl);
      setResult(next);
      setModels(next.models);
    } catch {
      setError("Unable to reach the backend to test the connection.");
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(undefined);
    try {
      const next = await updateSettings({
        lm_studio_base_url: baseUrl,
        lm_studio_model: model || null,
        lm_studio_extraction_timeout_seconds: timeoutSeconds,
      });
      setSaved(true);
      onSaved?.(next);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FramedPanel className="settings-panel" title="LM Studio connection">
      <p className="settings-hint">
        Terra Space processes documents through your local LM Studio. It stays usable when LM
        Studio is offline; only processing needs it running.
      </p>

      <div className="settings-connection-row">
        <label htmlFor="lm-base-url">LM Studio base URL</label>
        <input
          id="lm-base-url"
          onChange={(event) => {
            setBaseUrl(event.target.value);
            setSaved(false);
          }}
          value={baseUrl}
        />
        <button className="btn" disabled={testing} onClick={runTest} type="button">
          {testing ? "Testing…" : "Test connection"}
        </button>
        {result && (
          <span className="settings-status" data-motion-item="connection-status">
            <StatusChip
              colorVar={result.reachable ? "--status-confirmed" : "--status-denied"}
              label={result.reachable ? "Reachable" : "Offline"}
              value={result.reachable ? "reachable" : "offline"}
            />
            <span className="settings-status-message">{result.message}</span>
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="lm-model">Model</label>
        <select
          id="lm-model"
          onChange={(event) => {
            setModel(event.target.value);
            setSaved(false);
          }}
          value={model}
        >
          <option value="">Auto-detect (use first available)</option>
          {modelOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="lm-timeout">Processing timeout</label>
        <select
          id="lm-timeout"
          onChange={(event) => {
            setTimeoutSeconds(Number(event.target.value));
            setSaved(false);
          }}
          value={timeoutSeconds}
        >
          <option value={120}>2 minutes</option>
          <option value={300}>5 minutes (recommended)</option>
          <option value={600}>10 minutes</option>
        </select>
        <p className="settings-hint">
          The longest time Terra Space waits for one document. Longer settings help slower
          models, but also delay the next document when LM Studio is unresponsive.
        </p>
      </div>

      {error && <p className="document-error">{error}</p>}
      <div className="settings-actions">
        <button className="btn btn-primary" disabled={saving} onClick={save} type="button">
          {saving ? "Saving…" : "Save connection"}
        </button>
        {saved && (
          <span className="settings-saved" data-motion-item="save-status" role="status">
            Saved.
          </span>
        )}
      </div>
    </FramedPanel>
  );
}
