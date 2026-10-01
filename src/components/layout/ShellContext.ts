/**
 * What a page may ask of the shell around it.
 *
 * The menu sheet and the home-screen chooser belong to the shell — they cover
 * the whole app, not one page — but some of the buttons that open them now
 * live on the home screen itself: menu and search on the Cards layout, and the
 * layout button on both. Rather than lift that state into every page, the
 * shell hands down two functions.
 *
 * The default does nothing, so a page drawn outside the shell simply has
 * buttons that do nothing rather than a crash.
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
