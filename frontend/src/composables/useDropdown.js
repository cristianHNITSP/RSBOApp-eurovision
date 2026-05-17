import { useState, useEffect, useRef } from 'react';

const useDropdown = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((v) => !v);

  return { isOpen, open, close, toggle, ref };
};

export default useDropdown;
