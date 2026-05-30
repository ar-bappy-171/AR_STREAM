'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getParentalSettings,
  setParentalSettings,
  verifyPin,
  type ParentalSettings,
} from '@/lib/storage';
import { useAppStore } from '@/lib/store';

type FilterLevel = 'none' | 'mild' | 'strict';

const FILTER_LEVELS: { key: FilterLevel; label: string; description: string; icon: React.ElementType }[] = [
  {
    key: 'none',
    label: 'No Filter',
    description: 'Show all content regardless of rating or genre',
    icon: Eye,
  },
  {
    key: 'mild',
    label: 'Mild Filter',
    description: 'Hide horror/thriller genres and low-rated content (vote < 3)',
    icon: EyeOff,
  },
  {
    key: 'strict',
    label: 'Strict Filter',
    description: 'Only show family-friendly and animation content',
    icon: Shield,
  },
];

export default function ParentalControls() {
  const { kidsModeEnabled, setKidsModeEnabled } = useAppStore();
  const [settings, setSettings] = useState<ParentalSettings>(() => getParentalSettings());
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaved = useCallback((msg: string) => {
    setSavedMessage(msg);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedMessage(''), 2000);
  }, []);

  const handleToggleKidsMode = useCallback(() => {
    if (settings.enabled) {
      // Turning off - require PIN
      if (settings.pin) {
        setShowUnlockModal(true);
        setUnlockPinInput('');
      } else {
        const newSettings = { ...settings, enabled: false };
        setSettings(newSettings);
        setParentalSettings(newSettings);
        setKidsModeEnabled(false);
      }
    } else {
      // Turning on
      const newSettings = { ...settings, enabled: true };
      setSettings(newSettings);
      setParentalSettings(newSettings);
      setKidsModeEnabled(true);
      showSaved('Kids Mode enabled');
    }
  }, [settings, setKidsModeEnabled, showSaved]);

  const handleUnlock = useCallback(() => {
    if (verifyPin(unlockPinInput)) {
      const newSettings = { ...settings, enabled: false };
      setSettings(newSettings);
      setParentalSettings(newSettings);
      setKidsModeEnabled(false);
      setShowUnlockModal(false);
      setUnlockPinInput('');
      showSaved('Kids Mode disabled');
    } else {
      setPinError('Incorrect PIN');
      setTimeout(() => setPinError(''), 2000);
    }
  }, [unlockPinInput, settings, setKidsModeEnabled, showSaved]);

  const handleSetPin = useCallback(() => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinError('PIN must be exactly 4 digits');
      setTimeout(() => setPinError(''), 2000);
      return;
    }
    if (confirmPinInput !== pinInput) {
      setPinError('PINs do not match');
      setTimeout(() => setPinError(''), 2000);
      return;
    }
    const newSettings = { ...settings, pin: pinInput };
    setSettings(newSettings);
    setParentalSettings(newSettings);
    setPinInput('');
    setConfirmPinInput('');
    showSaved('PIN set successfully');
  }, [pinInput, confirmPinInput, settings, showSaved]);

  const handleChangeFilterLevel = useCallback((level: FilterLevel) => {
    const newSettings = { ...settings, filterLevel: level };
    setSettings(newSettings);
    setParentalSettings(newSettings);
    showSaved(`Filter level changed to ${level}`);
  }, [settings, showSaved]);

  return (
    <div className="w-full fade-in space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-ars/10 flex items-center justify-center">
            <Shield className="size-5 text-ars" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground">Parental controls & preferences</p>
          </div>
        </div>
      </div>

      {/* Saved message */}
      {savedMessage && (
        <div className="mx-4 sm:mx-6 lg:mx-8 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          {savedMessage}
        </div>
      )}

      {/* Kids Mode Toggle */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-card/60 border border-border/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.enabled ? (
                <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Lock className="size-5 text-emerald-500" />
                </div>
              ) : (
                <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <Unlock className="size-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="text-base font-semibold text-foreground">Kids Mode</h3>
                <p className="text-xs text-muted-foreground">
                  {settings.enabled
                    ? 'Content filtering is active'
                    : 'No content filtering applied'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleKidsMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-emerald-500' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={settings.enabled}
              aria-label="Toggle Kids Mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.enabled && (
            <div className="flex items-center gap-2 px-3 py-2 bg-ars/5 border border-ars/20 rounded-lg">
              <Lock className="h-4 w-4 text-ars" />
              <span className="text-sm text-ars font-medium">🔒 Kids Mode Active</span>
              <span className="text-xs text-muted-foreground ml-auto">
                Content is filtered
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content Filter Level */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-card/60 border border-border/50 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Content Filter Level</h3>
          <p className="text-xs text-muted-foreground">
            Choose what content is visible when Kids Mode is enabled
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FILTER_LEVELS.map((level) => {
              const Icon = level.icon;
              const isActive = settings.filterLevel === level.key;
              return (
                <button
                  key={level.key}
                  onClick={() => handleChangeFilterLevel(level.key)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-ars bg-ars/5 shadow-sm'
                      : 'border-border/50 bg-background/50 hover:border-ars/30 hover:bg-ars/5'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-4 w-4 text-ars" />
                    </div>
                  )}
                  <Icon className={`h-6 w-6 mb-2 ${isActive ? 'text-ars' : 'text-muted-foreground'}`} />
                  <h4 className="text-sm font-semibold text-foreground mb-1">{level.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{level.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PIN Settings */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-card/60 border border-border/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">PIN Protection</h3>
            {settings.pin ? (
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                <Lock className="h-3 w-3 mr-1" />
                PIN Set
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                No PIN
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Set a 4-digit PIN to prevent kids from disabling Kids Mode without permission
          </p>

          {/* Error message */}
          {pinError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {pinError}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-[200px]">
                <Input
                  type={showPin ? 'text' : 'password'}
                  placeholder={settings.pin ? 'New PIN' : 'Set PIN'}
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPinInput(val);
                  }}
                  maxLength={4}
                  className="text-center text-lg tracking-[0.5em] font-mono pr-10"
                  aria-label="Enter 4-digit PIN"
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {pinInput.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-[200px]">
                  <Input
                    type={showPin ? 'text' : 'password'}
                    placeholder="Confirm PIN"
                    value={confirmPinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setConfirmPinInput(val);
                    }}
                    maxLength={4}
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    aria-label="Confirm 4-digit PIN"
                  />
                </div>
              </div>
            )}
            {pinInput.length === 4 && confirmPinInput.length === 4 && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleSetPin}
              >
                <Lock className="h-3.5 w-3.5" />
                {settings.pin ? 'Update PIN' : 'Set PIN'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="size-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Enter PIN</h3>
                <p className="text-xs text-muted-foreground">PIN required to disable Kids Mode</p>
              </div>
            </div>
            {pinError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {pinError}
              </div>
            )}
            <Input
              type="password"
              placeholder="Enter 4-digit PIN"
              value={unlockPinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setUnlockPinInput(val);
              }}
              maxLength={4}
              className="text-center text-lg tracking-[0.5em] font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlock();
              }}
              aria-label="Enter PIN to unlock"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockPinInput('');
                  setPinError('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-ars hover:bg-ars/90 text-ars-foreground"
                onClick={handleUnlock}
                disabled={unlockPinInput.length !== 4}
              >
                Unlock
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
