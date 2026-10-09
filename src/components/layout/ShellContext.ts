/**
 * What a page may ask of the shell around it: open the menu (optionally with
 * the caret in its search box) and open the home-screen chooser. The default
 * does nothing, so a page drawn outside a shell has inert buttons, not a crash.
 */
import { createContext, useContext } from 'react';

export interface ShellApi {
  openMenu: (options?: { search?: boolean }) => void;
  openHomeChooser: () => void;
}

const noop = () => {};
const ShellContext = createContext<ShellApi>({ openMenu: noop, openHomeChooser: noop });

export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellApi {
  return useContext(ShellContext);
}
