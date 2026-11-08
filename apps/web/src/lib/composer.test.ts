import { describe,it,expect } from 'vitest';
import { questionFits,questionBytes } from './composer.js';
describe('question size matches the API UTF-8 limit',()=>{
 it('accepts ordinary text up to the character limit',()=>{expect(questionFits('a'.repeat(6000))).toBe(true);expect(questionFits('a'.repeat(6001))).toBe(false);});
 it('rejects a multibyte paste before the server would reject it',()=>{expect(questionBytes('🙂')).toBe(4);expect(questionFits('🙂'.repeat(2000))).toBe(true);expect(questionFits('🙂'.repeat(2001))).toBe(false);});
});
