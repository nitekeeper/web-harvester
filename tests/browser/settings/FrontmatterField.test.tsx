// tests/browser/settings/FrontmatterField.test.tsx

import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';

import { FrontmatterField } from '@presentation/settings/sections/templates/FrontmatterField';

afterEach(() => {
  cleanup();
});

/** Controlled wrapper so value prop reflects what was typed. */
function Wrapper({
  initial,
  onInsertVariable,
}: {
  readonly initial: string;
  readonly onInsertVariable?: (i: number) => void;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <FrontmatterField
      value={value}
      onChange={setValue}
      onInsertVariable={onInsertVariable ?? vi.fn()}
    />
  );
}

describe('FrontmatterField — focus preservation', () => {
  it('typing in the key input does not cause the input element to be remounted', () => {
    render(<Wrapper initial="title: {{title}}" />);
    const keyInput = screen.getByTestId('fm-key-0') as HTMLInputElement;
    const originalElement = keyInput;
    keyInput.focus();

    expect(document.activeElement).toBe(originalElement);

    fireEvent.change(keyInput, { target: { value: 'titlex' } });

    // After the change the same DOM node must still be the active element.
    // If the component remounted the input (due to a changing `key` prop),
    // document.activeElement would fall back to document.body.
    expect(document.activeElement).toBe(originalElement);
  });

  it('typing in the value input does not cause the input element to be remounted', () => {
    render(<Wrapper initial="title: {{title}}" />);
    const valueInput = screen.getByTestId('fm-value-0') as HTMLInputElement;
    const originalElement = valueInput;
    valueInput.focus();

    expect(document.activeElement).toBe(originalElement);

    fireEvent.change(valueInput, { target: { value: '{{title}} extra' } });

    expect(document.activeElement).toBe(originalElement);
  });
});

describe('FrontmatterField — insert variable button', () => {
  it('clicking the {{}} button calls onInsertVariable with the correct row index', () => {
    const onInsertVariable = vi.fn();
    render(
      <Wrapper
        initial={'title: {{title}}\nauthor: {{author}}'}
        onInsertVariable={onInsertVariable}
      />,
    );

    // Row 1 (index 1) — author row
    fireEvent.click(screen.getByTestId('fm-insert-var-1'));

    expect(onInsertVariable).toHaveBeenCalledWith(1);
  });
});
