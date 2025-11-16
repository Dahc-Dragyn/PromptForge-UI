// src/lib/clipboard.ts
import toast from 'react-hot-toast';

/**
 * Copies text to the clipboard, supporting asynchronous text retrieval 
 * (like a fetch request) in a way that Safari/macOS allows.
 * * @param textPromise A Promise that resolves with the string to be copied.
 */
export const copyTextAsPromise = async (textPromise: Promise<string>) => {
  try {
    // 1. Create a promise that resolves with a Blob
    const blobPromise = textPromise.then(
      (text) => new Blob([text], { type: 'text/plain' })
    );

    // 2. Pass the Blob promise directly into the ClipboardItem
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': blobPromise,
      }),
    ]);

    // We can handle the success toast in here or in the component
    // toast.success('Copied to clipboard!');

  } catch (err) {
    console.error('Clipboard write failed:', err);
    // Re-throw the error so the calling component can handle it
    throw new Error('Failed to copy to clipboard.');
  }
};