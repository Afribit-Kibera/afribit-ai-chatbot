export const QUESTION_MAX_CHARACTERS=6000;
export const QUESTION_MAX_BYTES=8000;
export function questionFits(value:string){return value.length<=QUESTION_MAX_CHARACTERS&&new TextEncoder().encode(value).byteLength<=QUESTION_MAX_BYTES;}
export function questionBytes(value:string){return new TextEncoder().encode(value).byteLength;}
