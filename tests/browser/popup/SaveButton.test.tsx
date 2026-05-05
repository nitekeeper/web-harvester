// tests/browser/popup/SaveButton.test.tsx
import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { SaveButton } from '@presentation/popup/components/SaveButton';

const NOOP = (): void => undefined;

describe('SaveButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows "Clip Page" label when not saving', () => {
    render(<SaveButton isSaving={false} isDisabled={false} onSave={NOOP} />);
    expect(screen.getByText('Clip Page')).not.toBeNull();
  });

  it('shows "Saving…" label when a save is in flight', () => {
    render(<SaveButton isSaving={true} isDisabled={false} onSave={NOOP} />);
    expect(screen.getByText('Saving…')).not.toBeNull();
  });
});
