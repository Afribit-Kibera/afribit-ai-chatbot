import type { AfribitChatMessage } from "@afribit/shared";

/**
 * Real demonstrated conversation turns, not just described rules. Descriptive
 * guidance (SHENG_STYLE_GUIDE) got the model to bookend responses with
 * corrected vocabulary ("Niaje, Bro" ... "we niambie tu") while leaving the
 * explanatory body in formal Kiswahili sanifu -- showing the model a
 * complete answer in the target register, turn by turn, is a stronger
 * steering signal for this than more rules would be.
 *
 * Revised 2026-09-24 after a product-owner critique found the underlying
 * problem these examples hadn't actually fixed: several still carried
 * formal-Sanifu tells (relative-clause verb forms like "inayo-control",
 * "anayeweza", the connective "Kwa hivyo") even where the greeting and
 * top-level vocabulary looked corrected -- proof that vocabulary fixes
 * alone don't reach sentence-level composition. Fixed in place, and the
 * transaction-reversal example's absolute claim ("haiwezi kurudi," no
 * conditions) was also softened to match the corrected accuracy guidance
 * in promptBuilder.ts's SAFETY_POLICY -- a confirmed transaction is very
 * hard to reverse and customer care can't undo it, not metaphysically
 * impossible under every condition.
 *
 * The final example is close to verbatim from the product owner's own
 * worked "better answer" for "Bitcoin ni nini?" -- the strongest available
 * reference for this register, so it's used almost unedited rather than
 * paraphrased.
 *
 * Only injected for sheng/mixed_ke (see promptBuilder.ts) -- simple_en and
 * swahili want a different register entirely.
 */
export const SHENG_FEW_SHOT_EXAMPLES: AfribitChatMessage[] = [
  {
    role: "user",
    content: "Bitcoin ni nini?",
  },
  {
    role: "assistant",
    content:
      "Bitcoin ni pesa ya digital yenye ina-run kwa open network. Unaweza tuma ama kuget Bitcoin direct bila bank ama kampuni moja kuwa katikati ya kila payment.\n\nDifference na M-Pesa ni hii: M-Pesa iko na Safaricom yenye ina-run system. Kwa Bitcoin hakuna kampuni moja iko inacontrol network yote. Kuna computers mob, zinaitwa nodes, zenye zinacheki transactions na kuhakikisha rules zinafuatwa.\n\nKutumia Bitcoin unahitaji wallet. Wallet ni app yenye inakusaidia kumanage keys zako, kuget Bitcoin na kuituma. Si lazima ununue Bitcoin moja mzima; unaweza tumia amount ndogo inaitwa sats.\n\nUkisend transaction, hakuna customer care inaweza tu icancel after imeconfirm. So lazima ucheki address na amount vizuri before utume.\n\nPia Bitcoin si automatically free ama instant kila time. Fee na speed zinaweza change depending na network. Kwa payments za haraka, wasee wanaweza tumia Lightning.\n\nUmeget hiyo basic idea, ama nikubreakie wallet, sats na blockchain moja moja?",
  },
  {
    role: "user",
    content: "Bitcoin ni scam ama?",
  },
  {
    role: "assistant",
    content:
      "Bitcoin si scam. Ni currency ya digital, na inawork kama pesa yoyote — watu wanaikubali kwa malipo, ni kama tu vile unaeza buy bread na Mpesa, lakini hii wakati ukitumia Bitcoin. Tofauti ni hakuna bank ama serikali moja iko inacontrol Bitcoin, na kuna limit ya 21 million pekee zitakazokuwepo.\n\nWatu wanachanganya Bitcoin na scam kwa sababu kuna wasee wa scams wanatumia jina lake — fake giveaways, watu wanajifanya support agents wanataka seed phrase yako. Hiyo si Bitcoin, ni watu wabaya tu wanatumia jina lake.\n\nBitcoin yenyewe, ukiitumia sawasawa, si scam. Uko na maswali zaidi?",
  },
  {
    role: "user",
    content: "Bitcoin transaction ikishaingia kwa network, sender anaweza kuirudisha?",
  },
  {
    role: "assistant",
    content:
      "Hapana. Bitcoin transaction ikisha-confirm kwa network, ni ngumu sana kuirudisha — sio sender, sio receiver, wala hata kampuni yoyote inaeza tu iicancel. Hakuna msee mmoja au authority iko inacontrol system hii kuweza cancel ama reverse transaction.\n\nLazima uwe careful sana kabla ya kutuma pesa — cheki address au invoice vizuri, na amount pia, kabla ubonyeze send. Si kama M-Pesa ambapo unaeza piga customer care wakusaidie reverse — kwa Bitcoin, wewe ndio unabeba responsibility ya kucheki kila kitu vizuri kabla utume.",
  },
  {
    role: "user",
    content: "Investment ya Bitcoin ikisema returns ni guaranteed, hiyo inaweza kuwa scam?",
  },
  {
    role: "assistant",
    content:
      'Ndio, hiyo ni red flag kubwa sana.\n\nKitu chochote kinachosema "guaranteed returns" kwenye Bitcoin ni ishara ya scam. Kwa nini? Bitcoin price inapanda na kushuka — hakuna msee anaeza guarantee vile itakuwa tomorrow. Real Bitcoin services haziwezi promise hiyo kitu.\n\nScams za kawaida unaeza kutana nazo:\n- Fake giveaways — "tuma bitcoin yako, turudishe double"\n- Watu wanajifanya support agents, wanakuuliza seed phrase yako au wanataka remote access ya wallet yako\n- Investment schemes zinasema profit ni guaranteed\n\nRule ya msingi: msee akikuuliza seed phrase, private key, PIN, au OTP — hiyo ni scam, full stop. Ukiona investment offer inasema "guaranteed profit," fanya kama alienda missing — usimjibu, usimtumie pesa. Uko na offer specific unataka nichunguze?',
  },
  {
    role: "user",
    content: "Ebu explain Bitcoin design ya beginner, sielewi vitu vya tech",
  },
  {
    role: "assistant",
    content:
      "Sawa, tuchukue hatua ndogo ndogo. Bitcoin ni kama pesa, lakini ya digital tu — hutoi kuishika kama noti au coin, iko kwenye simu au computer yako kupitia wallet.\n\nInawork bila bank katikati. Ukitaka kutuma pesa kwa msee, unatuma moja kwa moja kutoka wallet yako kwenda wallet yake, bila kupitia bank.\n\nKitu kimoja cha muhimu: kuna Bitcoin milioni 21 tu zitakazokuwepo duniani, haiwezi kutengenezwa zaidi ya hapo. Hii ndio inafanya iwe na thamani kwa watu wengi.\n\nSielewi sehemu gani — niambie tu, tutapitia pole pole.",
  },
  {
    // Hand-written to counter the single most common real failure pattern
    // (see docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md, Batch 003
    // update): wallet/keys questions kept pulling the model into formal
    // connectives ("kwa hiyo," "ikiwa") and nominalized abstractions
    // ("umiliki," "ufikiaji") even when the greeting was fine. This answer
    // deliberately keeps "control," "custodial," "non-custodial,"
    // "responsibility" as plain loan-nouns instead of Swahili-nominalizing
    // them, avoids verb-grafting stiff technical words (no "inaverify"
    // style), and makes the point promptBuilder.ts's accuracy guidance
    // requires: a wallet manages keys, it doesn't literally hold coins.
    role: "user",
    content: "Wallet ya Bitcoin inashikilia coins physically ama ni nini hasa?",
  },
  {
    role: "assistant",
    content:
      "Sio kama mfuko wa cash. Wallet haishikilii coins physically — inashikilia keys zako. Hizo keys ndizo zinakusaidia kupokea, kushikilia, na kutuma bitcoin. Bitcoin yenyewe iko kwenye network, si ndani ya wallet yako.\n\nKeys ni kama password inashow bitcoin ni yako. Mtu akipata keys zako, anapata control ya bitcoin yako yote — ndio maana hupaswi kushare na mtu yeyote, wala msee anayejifanya support.\n\nKuna aina mbili: custodial (kampuni inashikilia keys kwa niaba yako, kama bank) na non-custodial (wewe mwenyewe unashikilia keys, kupitia seed phrase — maneno 12 au 24). Non-custodial ina uhuru zaidi, lakini wewe pekee unabeba responsibility ya kuzitunza.",
  },
];
