'use client';

import { createContext, useContext, useRef, useState, useCallback } from 'react';
import ImagePreview from './index';

const ImagePreviewContext = createContext(null);

export function useImagePreview() {
  const context = useContext(ImagePreviewContext);
  if (!context) {
    throw new Error('useImagePreview must be used within an ImagePreviewProvider');
  }
  return context;
}

export function ImagePreviewProvider({ children }) {
  const registryRef = useRef(new Map());
  const [previewState, setPreviewState] = useState({
    open: false,
    images: [],
    initialIndex: 0,
  });

  const register = useCallback((id, src, alt, element) => {
    registryRef.current.set(id, { src, alt, element });
  }, []);

  const unregister = useCallback((id) => {
    registryRef.current.delete(id);
  }, []);

  const openPreview = useCallback((id) => {
    const registry = registryRef.current;
    const entries = Array.from(registry.entries());

    // Sort by DOM position using compareDocumentPosition
    entries.sort((a, b) => {
      const elementA = a[1].element;
      const elementB = b[1].element;
      if (!elementA || !elementB) return 0;
      const position = elementA.compareDocumentPosition(elementB);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });

    const images = entries.map(([, { src, alt }]) => ({ src, alt }));
    const initialIndex = entries.findIndex(([entryId]) => entryId === id);

    setPreviewState({
      open: true,
      images,
      initialIndex: initialIndex >= 0 ? initialIndex : 0,
    });
  }, []);

  const handleOpenChange = useCallback((open) => {
    setPreviewState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <ImagePreviewContext.Provider value={{ register, unregister, openPreview }}>
      {children}
      <ImagePreview
        open={previewState.open}
        onOpenChange={handleOpenChange}
        images={previewState.images}
        initialIndex={previewState.initialIndex}
      />
    </ImagePreviewContext.Provider>
  );
}
