// src/components/AutoSizingTextarea.tsx
'use client';

import React, { useLayoutEffect, useRef } from 'react';

interface AutoSizingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const AutoSizingTextarea: React.FC<AutoSizingTextareaProps> = ({ value, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Temporarily shrink height to get the true scrollHeight
      textarea.style.height = 'auto';
      // Set the height to the scrollHeight to fit the content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]); // Rerun this effect whenever the text value changes

  return <textarea ref={textareaRef} value={value} {...props} />;
};

export default AutoSizingTextarea;