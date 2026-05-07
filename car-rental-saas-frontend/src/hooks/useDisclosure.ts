import { useCallback, useState } from "react";

export function useDisclosure(initialState = false) {
  const [open, setOpen] = useState(initialState);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((value) => !value), []);

  return {
    open,
    onOpen,
    onClose,
    onToggle,
    setOpen,
  };
}

