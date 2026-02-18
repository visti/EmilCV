// Howl is a CDN global
export const uiHowl       = new Howl({ src: ['/files/audio/load.wav'],   preload: true });
export const uiHowlClose  = new Howl({ src: ['/files/audio/deload.wav'], preload: true });
export const uiHowlSlide  = new Howl({ src: ['/files/audio/slide.wav'],  preload: true });
export const uiHowlStatic = new Howl({ src: ['/files/audio/static.wav'], preload: true });

export function playWinOpen()  { try { uiHowl.play(); }       catch {} }
export function playWinClose() { try { uiHowlClose.play(); }  catch {} }
export function playSlide()    { try { uiHowlSlide.play(); }  catch {} }
export function playStatic()   { try { uiHowlStatic.play(); } catch {} }
