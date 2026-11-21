/**
 * Choosing a PIN: type six digits, type them again, saved.
 *
 * The old PIN is not asked for. Whoever is here is already inside an unlocked
 * session, which is exactly what the old PIN would have proved.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Spinner, useToast } from '@/components/ui';
import { DEFAULT_MINUTES, PIN_LENGTH, savePin } from '@/lib/pinLock';
import { PinDots, PinPad } from './PinPad';

export function PinSetup({
  open,
  uid,
  minutes,
  changing,
  onClose,
}: {
  open: boolean;
  uid: string;
  minutes?: number;
  changing: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPinState] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [saving, setSaving] = useState(false);
  const pinRef = useRef('');
  const firstRef = useRef('');
  const setPin = useCallback((next: string) => {
    pinRef.current = next;
    setPinState(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep('enter');
    setPin('');
    setError('');
    firstRef.current = '';
  }, [open, setPin]);

  const finish = useCallback(
    async (entered: string) => {
      if (step === 'enter') {
        firstRef.current = entered;
        window.setTimeout(() => {
          setStep('confirm');
          setPin('');
        }, 160);
        return;
      }
      if (entered !== firstRef.current) {
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
        setError('Those PINs do not match. Start again.');
        firstRef.current = '';
        setStep('enter');
        setPin('');
        return;
      }
      setSaving(true);
      try {
        await savePin(uid, entered, minutes ?? DEFAULT_MINUTES);
        toast.success(changing ? 'PIN changed' : 'PIN set', 'AfterBI asks for it every time it opens.');
        onClose();
      } catch (err) {
        toast.error('PIN not saved', err instanceof Error ? err.message : undefined);
        setPin('');
      } finally {
        setSaving(false);
      }
    },
    [step, uid, minutes, changing, toast, onClose, setPin],
  );

  const digit = useCallback(
    (d: string) => {
      if (saving || pinRef.current.length >= PIN_LENGTH) return;
      setError('');
      const next = pinRef.current + d;
      setPin(next);
      if (next.length === PIN_LENGTH) void finish(next);
    },
    [saving, finish, setPin],
  );
  const back = useCallback(() => setPin(pinRef.current.slice(0, -1)), [setPin]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={changing ? 'Change your PIN' : 'Set your PIN'}
      description="Six digits, only for you. It is not your password."
    >
      <div className="flex flex-col items-center pb-2 pt-1">
        <p className="text-body font-semibold text-primary">
          {step === 'enter' ? 'Enter a new PIN' : 'Enter it again to confirm'}
        </p>
        <div className="mt-4">
          <PinDots count={pin.length} tone="card" shake={shake} />
        </div>
        <p className="mt-2.5 flex min-h-[1.4rem] items-center text-label font-semibold text-red-600 dark:text-red-400" aria-live="assertive">
          {saving ? <Spinner size={15} /> : error}
        </p>
        <div className="mt-3">
          <PinPad length={pin.length} onDigit={digit} onBack={back} tone="card" disabled={saving} listen={open} />
        </div>
      </div>
    </Modal>
  );
}
