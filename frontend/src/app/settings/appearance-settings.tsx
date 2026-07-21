"use client";

import { FramedPanel } from "@/components/framed-panel";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  resetAppearanceSettings,
  setAppearanceSettings,
  useAppearanceSettings,
} from "@/lib/appearance-settings";

export function AppearanceSettings() {
  const settings = useAppearanceSettings();
  const isDefault =
    settings.blurPx === DEFAULT_APPEARANCE_SETTINGS.blurPx &&
    settings.motionEnabled === DEFAULT_APPEARANCE_SETTINGS.motionEnabled &&
    settings.motionIntensity === DEFAULT_APPEARANCE_SETTINGS.motionIntensity &&
    settings.driftSpeed === DEFAULT_APPEARANCE_SETTINGS.driftSpeed &&
    settings.scanStrength === DEFAULT_APPEARANCE_SETTINGS.scanStrength;

  return (
    <FramedPanel className="settings-panel appearance-panel" title="Appearance">
      <p className="settings-hint">
        How the background behind each screen looks and moves. This is saved on this device only —
        it does not affect other computers or your data.
      </p>

      <label className="event-type-toggle appearance-motion-toggle">
        <input
          checked={settings.motionEnabled}
          onChange={(event) => setAppearanceSettings({ motionEnabled: event.target.checked })}
          type="checkbox"
        />
        <span>Background motion</span>
      </label>

      <div className="appearance-field">
        <label htmlFor="appearance-blur">
          <span>Background blur</span>
          <span className="appearance-value">{settings.blurPx}px</span>
        </label>
        <input
          id="appearance-blur"
          max={8}
          min={0}
          onChange={(event) => setAppearanceSettings({ blurPx: Number(event.target.value) })}
          step={0.5}
          type="range"
          value={settings.blurPx}
        />
        <p className="settings-hint">How far the background recedes behind your content.</p>
      </div>

      <div className="appearance-field" data-disabled={!settings.motionEnabled || undefined}>
        <label htmlFor="appearance-intensity">
          <span>Motion intensity</span>
          <span className="appearance-value">{Math.round(settings.motionIntensity * 100)}%</span>
        </label>
        <input
          disabled={!settings.motionEnabled}
          id="appearance-intensity"
          max={200}
          min={0}
          onChange={(event) => setAppearanceSettings({ motionIntensity: Number(event.target.value) / 100 })}
          step={10}
          type="range"
          value={Math.round(settings.motionIntensity * 100)}
        />
        <p className="settings-hint">Number and brightness of the drifting data motes.</p>
      </div>

      <div className="appearance-field" data-disabled={!settings.motionEnabled || undefined}>
        <label htmlFor="appearance-speed">
          <span>Drift speed</span>
          <span className="appearance-value">{settings.driftSpeed.toFixed(1)}×</span>
        </label>
        <input
          disabled={!settings.motionEnabled}
          id="appearance-speed"
          max={2.5}
          min={0}
          onChange={(event) => setAppearanceSettings({ driftSpeed: Number(event.target.value) })}
          step={0.1}
          type="range"
          value={settings.driftSpeed}
        />
        <p className="settings-hint">How fast the motes and scan band move.</p>
      </div>

      <div className="appearance-field" data-disabled={!settings.motionEnabled || undefined}>
        <label htmlFor="appearance-scan">
          <span>Scan band</span>
          <span className="appearance-value">{Math.round(settings.scanStrength * 100)}%</span>
        </label>
        <input
          disabled={!settings.motionEnabled}
          id="appearance-scan"
          max={150}
          min={0}
          onChange={(event) => setAppearanceSettings({ scanStrength: Number(event.target.value) / 100 })}
          step={10}
          type="range"
          value={Math.round(settings.scanStrength * 100)}
        />
        <p className="settings-hint">Visibility of the slow reconstruction sweep. 0 turns it off.</p>
      </div>

      <div className="settings-actions">
        <button
          className="btn"
          disabled={isDefault}
          onClick={() => resetAppearanceSettings()}
          type="button"
        >
          Reset to defaults
        </button>
      </div>
    </FramedPanel>
  );
}
