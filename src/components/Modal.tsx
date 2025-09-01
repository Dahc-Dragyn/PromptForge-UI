// src/components/Modal.tsx
'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg relative">
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          &times;
        </button>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;