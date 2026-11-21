/**
 * A few of the owner's Secondary artworks (Contoric Design Artworks, Business
 * and Technology sets), copied out of marketing/scenes.tsx so the app does not
 * load every public page scene to draw one or two:
 *   secure-payment     a striped bank card and a shield (Company info)
 *   billing-calendar   a calendar with a due date (HR, salary day)
 */
import { useId } from 'react';
import { cn } from '@/lib/cn';

const SCENES = {
  'secure-payment': "<defs><pattern id=\"%ID%secure12stripes\" width=\"5\" height=\"5\" patternUnits=\"userSpaceOnUse\"><path d=\"M0 1H5\" stroke=\"#B8D9FF\" stroke-width=\"1\" opacity=\".65\"/></pattern></defs> <ellipse cx=\"199\" cy=\"348\" rx=\"148\" ry=\"9\" fill=\"#91B7EC\" opacity=\".45\"/> <g transform=\"rotate(-9 189 198)\"> <rect x=\"54\" y=\"106\" width=\"278\" height=\"181\" rx=\"20\" fill=\"#003DA8\" transform=\"translate(7 9)\"/> <rect x=\"54\" y=\"106\" width=\"278\" height=\"181\" rx=\"20\" fill=\"#0866F5\"/> <rect x=\"54\" y=\"106\" width=\"278\" height=\"181\" rx=\"20\" fill=\"url(#%ID%secure12stripes)\"/> <path d=\"M54 150H332V188H54Z\" fill=\"#003DA8\"/> <path d=\"M54 150H332V188H54Z\" fill=\"url(#%ID%secure12stripes)\"/> <rect x=\"79\" y=\"209\" width=\"48\" height=\"34\" rx=\"7\" fill=\"#DCEEFF\"/> <path d=\"M103 209v34M79 226h48\" stroke=\"#7EAFE8\" stroke-width=\"3\"/> <path d=\"M82 264h88m16 0h38\" stroke=\"#E8F4FF\" stroke-width=\"8\" stroke-linecap=\"round\"/> <path d=\"M69 122h90\" stroke=\"#92C8FF\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".85\"/> </g> <path d=\"M258 175L330 198V256C330 304 294 332 258 347C222 332 186 304 186 256V198Z\" fill=\"#003DA8\" transform=\"translate(6 7)\"/> <path d=\"M258 175L330 198V256C330 304 294 332 258 347C222 332 186 304 186 256V198Z\" fill=\"#0866F5\"/> <path d=\"M258 175L330 198V256C330 304 294 332 258 347C222 332 186 304 186 256V198Z\" fill=\"url(#%ID%secure12stripes)\"/> <path d=\"M258 194L311 212V256C311 289 287 313 258 326C229 313 205 289 205 256V212Z\" fill=\"#0754CF\" stroke=\"#8CC5FF\" stroke-width=\"5\"/> <path d=\"M233 258l17 17 35-40\" stroke=\"#EAF5FF\" stroke-width=\"13\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  'billing-calendar': "<defs><pattern id=\"%ID%stripe10\" width=\"5\" height=\"5\" patternUnits=\"userSpaceOnUse\"><path d=\"M0 1H5\" stroke=\"#B8D9FF\" stroke-width=\"1\" opacity=\".67\"/></pattern></defs> <ellipse cx=\"197\" cy=\"348\" rx=\"149\" ry=\"9\" fill=\"#91B7EC\" opacity=\".48\"/> <rect x=\"68\" y=\"74\" width=\"271\" height=\"255\" rx=\"21\" fill=\"#003DA8\"/> <rect x=\"60\" y=\"66\" width=\"271\" height=\"255\" rx=\"21\" fill=\"#0866F5\"/> <rect x=\"60\" y=\"66\" width=\"271\" height=\"255\" rx=\"21\" fill=\"url(#%ID%stripe10)\"/> <path d=\"M81 66H310Q331 66 331 87V132H60V87Q60 66 81 66Z\" fill=\"#0754D6\"/> <path d=\"M81 66H310Q331 66 331 87V132H60V87Q60 66 81 66Z\" fill=\"url(#%ID%stripe10)\"/> <rect x=\"91\" y=\"48\" width=\"18\" height=\"43\" rx=\"9\" fill=\"#003DA8\"/><rect x=\"276\" y=\"48\" width=\"18\" height=\"43\" rx=\"9\" fill=\"#003DA8\"/> <rect x=\"96\" y=\"43\" width=\"18\" height=\"43\" rx=\"9\" fill=\"#B8DAFF\"/><rect x=\"281\" y=\"43\" width=\"18\" height=\"43\" rx=\"9\" fill=\"#B8DAFF\"/> <rect x=\"78\" y=\"145\" width=\"235\" height=\"158\" rx=\"10\" fill=\"#E8F4FF\"/> <g fill=\"#91C2FF\"><rect x=\"94\" y=\"163\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"135\" y=\"163\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"176\" y=\"163\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"217\" y=\"163\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"258\" y=\"163\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"94\" y=\"199\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"135\" y=\"199\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"176\" y=\"199\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"217\" y=\"199\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"258\" y=\"199\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"94\" y=\"235\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"135\" y=\"235\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"176\" y=\"235\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"217\" y=\"235\" width=\"31\" height=\"26\" rx=\"5\"/><rect x=\"258\" y=\"235\" width=\"31\" height=\"26\" rx=\"5\"/></g> <rect x=\"176\" y=\"199\" width=\"31\" height=\"26\" rx=\"5\" fill=\"#0866F5\"/> <path d=\"M183 211l6 6 11-13\" stroke=\"#FFFFFF\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/> <g transform=\"translate(237 243)\"><circle cx=\"52\" cy=\"52\" r=\"59\" fill=\"#003DA8\"/><circle cx=\"47\" cy=\"47\" r=\"59\" fill=\"#0866F5\"/><circle cx=\"47\" cy=\"47\" r=\"59\" fill=\"url(#%ID%stripe10)\"/><circle cx=\"47\" cy=\"47\" r=\"45\" stroke=\"#B9DCFF\" stroke-width=\"6\"/><path d=\"M47 18v58M62 27c-11-10-29-8-34 4-5 13 9 18 22 22 14 5 19 16 9 25-9 8-25 7-34-2\" stroke=\"#F1F8FF\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g> <path d=\"M74 89V85Q74 79 80 79H90\" stroke=\"#8BC0FF\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".8\"/>",
} as const;

export type AppScene = keyof typeof SCENES;

export function SceneArt({ name, className, still = false }: { name: AppScene; className?: string; still?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden
      className={cn(!still && 'scene-float', className)}
      dangerouslySetInnerHTML={{ __html: SCENES[name].replaceAll('%ID%', `${uid}-`) }}
    />
  );
}

/** Company info's artwork, by its old name. */
export function SecurePaymentArt({ className }: { className?: string }) {
  return <SceneArt name="secure-payment" className={className} />;
}
