'use client';

import { Dialog, Transition } from '@headlessui/react';
import type { CSSProperties, ReactNode } from 'react';
import { Fragment } from 'react';

type ModalStyles = {
  overlay?: CSSProperties;
  content?: CSSProperties;
};

type ModalProps = {
  isOpen: boolean;
  onRequestClose?: () => void;
  closeTimeoutMS?: number;
  contentLabel?: string;
  style?: ModalStyles;
  children?: ReactNode;
};

export default function Modal({
  isOpen,
  onRequestClose,
  closeTimeoutMS,
  contentLabel,
  style,
  children
}: ModalProps) {
  const duration = closeTimeoutMS ?? 200;
  const safeClose = onRequestClose ?? (() => {});

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50"
        onClose={safeClose}
      >
        <div className="fixed inset-0">
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-black/50"
              style={{ ...style?.overlay, transitionDuration: `${duration}ms` }}
            />
          </Transition.Child>
        </div>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                aria-label={contentLabel}
                className="w-full max-w-3xl rounded-lg bg-gray-900 border border-gray-700 shadow-xl"
                style={{ ...style?.content, transitionDuration: `${duration}ms` }}
              >
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
