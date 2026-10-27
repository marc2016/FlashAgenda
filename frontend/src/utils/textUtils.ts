// The Bangers comic font only has capitals and renders "ß" incorrectly; display it as "SS" instead
export const toComicCaps = (text: string = ''): string => text.replace(/ß/g, 'SS');
