import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DragDrop } from '../Intake/DragDrop';

describe('DragDrop', () => {
  it('invokes onFilesAdded when clicking browse', async () => {
    const handleFiles = jest.fn();
    render(<DragDrop onFilesAdded={handleFiles} />);

    const button = screen.getByRole('button', { name: /drop documents/i });
    fireEvent.click(button);

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => expect(handleFiles).toHaveBeenCalledTimes(1));
    expect(handleFiles.mock.calls[0][0][0].name).toBe('test.pdf');
  });

  it('limits files to maxFiles', async () => {
    const handleFiles = jest.fn();
    render(<DragDrop onFilesAdded={handleFiles} maxFiles={1} />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    const files = [
      new File(['one'], 'one.pdf', { type: 'application/pdf' }),
      new File(['two'], 'two.pdf', { type: 'application/pdf' }),
    ];
    fireEvent.change(input as HTMLInputElement, { target: { files } });
    await waitFor(() => expect(handleFiles).toHaveBeenCalledTimes(1));
    expect(handleFiles.mock.calls[0][0]).toHaveLength(1);
  });
});
