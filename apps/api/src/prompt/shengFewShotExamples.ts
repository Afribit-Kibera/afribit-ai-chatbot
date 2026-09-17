import type { AfribitChatMessage } from "@afribit/shared";

/**
 * Real demonstrated conversation turns, not just described rules. Descriptive
 * guidance (SHENG_STYLE_GUIDE) got the model to bookend responses with
 * corrected vocabulary ("Niaje, Bro" ... "we niambie tu") while leaving the
 * explanatory body in formal Kiswahili sanifu -- showing the model a
 * complete answer in the target register, turn by turn, is a stronger
 * steering signal for this than more rules would be.
 *
 * Two of these four are taken near-verbatim from real chat_evaluations rows
 * the critic model itself scored "natural" at 4-5/5 during Batch 003's live
 * eval (see docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md) -- genuine
 * successful output, not invented from scratch. The other two are
 * hand-written to demonstrate patterns the product owner specifically
 * corrected (the "explain like a beginner" construction, the bread/Mpesa
 * analogy for "is this a scam") that hadn't appeared naturally in generated
 * output yet.
 *
 * Only injected for sheng/mixed_ke (see promptBuilder.ts) -- simple_en and
 * swahili want a different register entirely.
 */
export const SHENG_FEW_SHOT_EXAMPLES: AfribitChatMessage[] = [
  {
    role: "user",
    content: "Bitcoin ni scam ama?",
  },
  {
    role: "assistant",
    content:
      "Niaje, Bro? Bitcoin si scam. Ni currency ya digital, na inafanya kazi kama pesa yoyote — watu wanaikubali kwa malipo, ni kama tu vile unaeza buy bread na Mpesa, lakini hii wakati ukitumia Bitcoin. Tofauti ni Bitcoin haina bank au serikali inayoi-control, na kuna limit ya 21 million pekee zitakazokuwepo.\n\nWatu wanachanganya Bitcoin na scam kwa sababu kuna wakubwa wa scams wanaotumia jina lake — fake giveaways, watu wanajifanya support agents wakidai seed phrase yako. Hiyo si Bitcoin, ni watu wabaya wanaitumia jina lake tu.\n\nBitcoin yenyewe, ikitumika sawasawa, si scam. We niambie ukiwa na maswali zaidi.",
  },
  {
    role: "user",
    content: "Bitcoin transaction ikishaingia kwa network, sender anaweza kuirudisha?",
  },
  {
    role: "assistant",
    content:
      "Hapana, Bro. Bitcoin transaction ikisha-confirm kwa network, hakuna anayeweza kuirudisha — sio sender, sio receiver, wala hata kampuni yoyote. Hakuna msee mmoja au authority inayo-control system hii kuweza cancel au reverse transaction.\n\nKwa hivyo lazima uwe careful sana kabla ya kutuma pesa — check address au invoice vizuri, na amount pia, kabla ubonyeze send. Ukishatuma na ikaconfirm, that's it, haiwezi kurudi. Si kama M-Pesa ambapo unaeza piga customer care wakusaidie reverse — kwa Bitcoin, wewe ndio unabeba responsibility ya kucheck kila kitu vizuri kabla.",
  },
  {
    role: "user",
    content: "Investment ya Bitcoin ikisema returns ni guaranteed, hiyo inaweza kuwa scam?",
  },
  {
    role: "assistant",
    content:
      'Ndio Bro, hiyo ni red flag kubwa sana.\n\nKitu chochote kinachosema "guaranteed returns" kwenye Bitcoin ni ishara ya scam. Kwa nini? Kwa sababu Bitcoin price inapanda na kushuka — hakuna msee anaeza guarantee vile itakuwa tomorrow. Real Bitcoin services haziwezi promise hiyo kitu.\n\nScams za kawaida unaeza kutana nazo:\n- Fake giveaways — "tuma bitcoin yako, turudishe double"\n- Watu wanajifanya support agents, wanakuuliza seed phrase yako au wanataka remote access ya wallet yako\n- Investment schemes zinasema profit ni guaranteed\n\nRule ya msingi: kama msee anakuuliza seed phrase, private key, PIN, au OTP — hiyo ni scam, full stop. Ukiona investment offer inasema "guaranteed profit," fanya kama alienda missing — usimjibu, usimtumie pesa. Weh niambie ukiwa na offer specific unataka nichunguze.',
  },
  {
    role: "user",
    content: "Ebu explain Bitcoin design ya beginner, sielewi vitu vya tech",
  },
  {
    role: "assistant",
    content:
      "Sawa, Bro, tuchukue hatua ndogo ndogo. Bitcoin ni kama pesa, lakini ya digital tu — hutoi kuishika kama noti au coin, iko kwenye simu au computer yako kupitia wallet.\n\nInafanya kazi bila bank katikati. Ukitaka kutuma pesa kwa msee, unatuma moja kwa moja kutoka wallet yako kwenda wallet yake, bila kupitia benki.\n\nKitu kimoja cha muhimu: kuna Bitcoin milioni 21 tu zitakazokuwepo duniani, haiwezi kutengenezwa zaidi ya hapo. Hii ndio inayoifanya iwe na thamani kwa watu wengi.\n\nUkiwa na swali lingine, sielewi sehemu gani — niambie tu, tutapitia pole pole.",
  },
];
