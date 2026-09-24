import type { RetrievalResult, LanguageMode } from "@afribit/shared";

/**
 * Shared test cases for the communication-style eval (docs/COMMUNICATION_STYLE_EVAL.md),
 * used by both promptGoldenCases.ts (static prompt-construction check, no
 * DB/API needed) and runCommunicationEval.ts (live model + judge run).
 * Kept in one place so the two never drift apart -- a case added here is
 * automatically covered by both.
 *
 * Each RetrievalResult below is copied verbatim from the seeded manual
 * content (apps/api/src/db/data/*.json), matching exactly how
 * seedCommunityManuals.ts assembles canonical_answer/beginner_answer/
 * safety_notes and how retrieval.ts maps a DB row into a RetrievalResult.
 */

function toResult(conceptId: string, canonical: string, beginner: string, safety: string[]): RetrievalResult {
  return {
    conceptId,
    authoritativeContent: canonical,
    approvedExamples: [beginner],
    languageGuidance: null,
    safetyWarnings: safety,
    sourceVersion: 1,
    freshnessDate: new Date().toISOString(),
    relatedConcepts: [],
    confidence: 0.9,
  };
}

const CH17_SECURITY = toResult(
  "btcman.ch17.security_and_avoiding_scams",
  [
    "Bitcoin payments are difficult to reverse, and stolen self-custody funds may be impossible to recover. Security depends on protecting secrets, verifying payment details, using trustworthy software, and recognizing social-engineering scams.",
    "No legitimate helper needs a recovery phrase or private key to investigate a payment. A scammer may create urgency, impersonate support, promise an airdrop or investment return, or ask the user to install remote-control software.",
    "Verify the full payment request through a trusted channel. Malware can replace copied addresses. A small test payment can reduce risk for a new high-value destination, but the user must verify that the second payment uses the intended address or request as well.",
    "Kibera example: A learner receives a Telegram message from someone claiming to be wallet support. The person asks for the twelve words to fix a stuck payment. The correct action is to stop. The phrase would let the scammer recreate the wallet; it cannot safely be shared for troubleshooting.",
  ].join("\n\n"),
  "Bitcoin ikishatumwa vibaya, hakuna cancel button ya central office. Protect recovery phrase na private keys. Check address na amount before Pay. Usitrust DM ya msee anajiita support, na usiamini guaranteed profit ama fee ya kuunlock funds.",
  [
    "A familiar logo does not prove a message is genuine.",
    "A transaction being irreversible makes verification more important.",
    "Remote access to a phone can expose wallet information even if the phrase is not typed into chat.",
    "AI guidance: If a user may be under active attack, prioritize stopping further loss. Tell them not to share more information, disconnect remote access, and use the wallet provider's official security process. Do not improvise recovery steps without knowing the wallet type.",
  ],
);

const CH12_CONFIRMATIONS = toResult(
  "btcman.ch12.confirmations_and_payment_finality",
  [
    "A transaction gets its first confirmation when it is included in a valid block. Each accepted block added after it increases the confirmation count. More confirmations make reversing the transaction increasingly difficult.",
    "Before confirmation, an on-chain transaction may appear in the mempool. It can still conflict with another transaction, be replaced under some policies, or wait for a long time if the fee rate is low. A zero-confirmation payment therefore carries more risk.",
    "Lightning payments use a different operational model. A successful wallet result normally settles through the Lightning channel network without waiting for a new on-chain block for each retail payment.",
    "Kibera example: A customer pays for tea using Lightning and the merchant's wallet shows the invoice as settled almost immediately. For an on-chain purchase of expensive equipment, the merchant may wait for confirmations according to a written policy before releasing the item.",
  ].join("\n\n"),
  "Transaction ikingia kwa block valid, inapata confirmation ya kwanza. Kila block ingine ikiongezwa juu yake, confirmation inaongezeka. Confirmations mob zinafanya kurudisha history nyuma ikuwe ngumu zaidi.",
  [
    "Seen is not always confirmed.",
    "Six confirmations is a risk reference, not a magical guarantee.",
    "Lightning payment status should be checked by the receiver.",
    "AI guidance: Ask whether the payment is on-chain or Lightning before explaining confirmation time. Do not promise a precise arrival time for a probabilistic process.",
  ],
);

const CH06_RECOVERY = toResult(
  "btcman.ch06.recovery_phrases_and_backups",
  [
    "Many self-custody wallets provide a recovery phrase, sometimes called a seed phrase, made of a sequence of words. It can recreate the keys for the wallet. Anyone who has it may be able to take the funds.",
    "A recovery phrase is different from an app password, PIN, email login, or one-time password. A recovery phrase can recreate the underlying wallet keys in compatible software.",
    "Write the phrase accurately in the correct order and store it where fire, water, theft, and casual viewing are considered. Do not store the only copy on the same phone as the wallet. Do not enter it into a website because someone claims to be support.",
    "Kibera example: A learner loses a phone. If the wallet was self-custody and the recovery phrase is correct, the learner may restore access on a compatible wallet. If the phrase was saved only as a screenshot on the lost phone, both availability and secrecy are now at risk.",
  ].join("\n\n"),
  "Recovery phrase ama seed phrase ni zile words wallet inakupea kama backup ya mwisho. Simu ikipotea, hizo words zinaweza kusaidia urudishe wallet kwa device ingine. Lakini msee akizipata, anaweza control doo yako. Usipige screenshot, usitume WhatsApp, na usipee support agent.",
  [
    "No genuine support agent needs the recovery phrase to check a transaction.",
    "Cloud photos and chat backups can expose screenshots.",
    "AI guidance: Ask which wallet and custody model the learner uses. Give process guidance without asking the learner to type, photograph, or read out any recovery words.",
  ],
);

const CH10_BOUNDARIES = toResult(
  "commman.ch10.yes_no_and_personal_boundaries",
  [
    "A clear yes is voluntary and informed. A clear no should be respected. Silence, fear, pressure, intoxication, uncertainty, or dependence can make consent unclear. Boundaries can cover time, touch, money, information, devices, photos, and conversation topics.",
    "Assertiveness is direct and respectful. It differs from passivity, where needs remain hidden, and aggression, where the speaker threatens or humiliates another person.",
    'Use an I-statement: name the behaviour, its effect, and the request. "Ukishare number yangu bila kuniuliza, niko uncomfortable. Please niulize kwanza."',
    "A boundary does not require a long defence. In unsafe situations, leave, seek help, or contact a trusted person rather than continuing a perfect conversation.",
    'Example conversation:\nAlex  Nitumie picha yako nishare kwa group.  —  Send me your photo so I can share it in the group.\nMumbi  Hapana, sitaki picha yangu isharewe. Unaweza tuma jina yangu tu.  —  No, I do not want my photo shared. You can send only my name.\nAlex  Sawa, nitatuma jina tu.  —  Okay, I will send only the name.',
  ].join("\n\n"),
  "Yes lazima ikuwe ya ukweli, bila pressure, na msee ajue anaagree na nini. “No,” “sitaki,” “siwezi,” ama “wacha” inafaa irespected. Silence si automatic yes. Unaweza set boundary kuhusu simu, picha, doo, touch, time ama info yako.",
  [
    "Treating silence or nervous laughter as agreement.",
    "Asking repeatedly after a clear refusal.",
    "Using threats or public shame to obtain compliance.",
    "AI guidance: Prioritise consent and safety. Do not coach the learner to pressure, trick, or guilt another person. If the situation is unsafe, recommend leaving and seeking local help.",
  ],
);

const CH01_SHUTDOWN = toResult(
  "btc.basics.can_be_shut_down",
  "Because Bitcoin runs on thousands of independent computers spread across many countries rather than one central server, there is no single point to shut down. A government could restrict its use within its own borders, but that is different from being able to switch the network off entirely.",
  "Bitcoin haina server moja ya kuizima, kwa sababu inaendeshwa na kompyuta elfu nyingi kote ulimwenguni. Serikali inaweza kuzuia matumizi yake nchini mwao, lakini hilo ni tofauti na kuizima Bitcoin yenyewe kabisa.",
  [],
);

const CH13_HALVING = toResult(
  "btcman.ch13.bitcoin_supply_and_halving",
  [
    "Bitcoin's rules limit total issuance to 21 million BTC. New bitcoin enters circulation through the block subsidy paid to miners. The subsidy is cut in half every 210,000 blocks, roughly every four years, until issuance becomes negligible and eventually stops.",
    "The supply limit is enforced by consensus rules checked by nodes. A miner cannot claim any reward amount they want.",
    "A halving is based on block height, not a calendar appointment. People estimate the date using average block times.",
    "Scarcity does not guarantee demand or price. Market price reflects buyers, sellers, liquidity, expectations, regulation, technology, and many other factors. The AI tutor must not turn the supply schedule into a promise of profit.",
    "Kibera example: A learner hears that a halving is coming and assumes the price must double. The trainer separates two ideas: the protocol cuts new issuance per block, while the market decides price. One does not mechanically set the other.",
  ].join("\n\n"),
  "Bitcoin supply iko na limit ya BTC million 21. Bitcoin mpya inaingia kupitia block subsidy ya miners. Baada ya blocks 210,000, hiyo subsidy inakatwa half. Hii ndio halving. Ni rule ya issuance, si promise ati price lazima ipande.",
  [
    "Twenty-one million describes issuance, not the number of coins actively available for sale.",
    "Halving does not cut existing wallet balances.",
    "Scarcity is one property; it is not investment advice.",
    "AI guidance: Use neutral language. State the supply rule, explain uncertainty in calendar estimates, and refuse guaranteed price claims.",
  ],
);

const CH14_FEES = toResult(
  "btcman.ch14.transaction_fees",
  [
    "An on-chain transaction fee pays for scarce block space. Wallets normally estimate a fee rate based on transaction size and current demand. The fee is not simply a percentage of the value being sent.",
    "Fees are commonly discussed in satoshis per virtual byte. A transaction using several inputs can be larger than one using a single input, even if both send the same value.",
    "Miners often prioritize transactions offering higher fee rates. A low-fee transaction may wait during congestion.",
    "The sender normally chooses and pays the on-chain miner fee. Custodial platforms can add withdrawal or service fees that are separate from the network fee.",
    "Kibera example: Two customers each send KES-equivalent value on-chain. One wallet spends many small UTXOs and creates a larger transaction, while the other spends one suitable UTXO. Their network fees may differ even though the shopping value is the same.",
  ].join("\n\n"),
  "On-chain fee ni payment ya space kwa block. Wallet inaestimate kulingana na transaction size na vile network iko busy. Kutuma BTC mingi si lazima kuwe na fee kubwa kuliko kutuma BTC kidogo. Inputs na data ya transaction ndio inaweza change size.",
  [
    "High payment value does not automatically mean high miner fee.",
    "A wallet fee estimate is not a permanent price.",
    "Lightning and on-chain fees are calculated differently.",
    "AI guidance: When a learner reports an expensive fee, ask whether it is on-chain, Lightning, or a provider withdrawal charge. Never assume all displayed fees go to miners.",
  ],
);

const CH15_ONCHAIN_LIGHTNING = toResult(
  "btcman.ch15.on_chain_and_lightning_payments",
  [
    "An on-chain payment is recorded in a Bitcoin block. Lightning is a second-layer payment network that uses payment channels anchored to Bitcoin. Lightning can support fast, low-cost payments without putting every retail transfer directly into a block.",
    "On-chain payments use Bitcoin addresses or payment requests. Confirmation timing and fees depend on block demand.",
    "Lightning payments commonly use invoices. The payment can fail if there is no suitable route, insufficient liquidity, an expired invoice, or another temporary problem.",
    "Lightning does not create a different asset. A Lightning balance represents bitcoin committed within channel-based arrangements or credited by a service.",
    "Kibera example: A vegetable seller has several customers waiting. A Lightning QR or compatible reusable payment request lets a customer scan and pay quickly.",
  ].join("\n\n"),
  "On-chain payment inaenda kwa blockchain na inangoja block confirmation. Lightning ni layer ingine juu ya Bitcoin yenye inatumia payment channels. Inasaidia payments ndogo zipite haraka na fee ndogo bila kila payment kuingia direct kwa block.",
  [
    "Lightning is built on Bitcoin, but it is not identical to an on-chain transaction.",
    "Fast does not mean risk-free or always successful.",
    "A Lightning wallet can still be custodial.",
    "AI guidance: Teach the visible difference first: address versus invoice, block confirmation versus Lightning settlement.",
  ],
);

const CH04_WALLETS_QR = toResult(
  "btcman.ch04.wallets_addresses_and_qr_codes",
  [
    "A Bitcoin wallet is software or a device that manages the keys used to receive and spend bitcoin. A Bitcoin address or payment request tells another wallet where or how to pay. A QR code is a machine-readable way to carry that payment information.",
    "An address is meant for receiving. A private key or recovery phrase is never a receiving address and must never be shared.",
    "A QR code can encode an address, an on-chain payment request, a Lightning invoice, or another payment identifier. A learner must still check the wallet screen after scanning.",
    "A merchant should generate a fresh payment request for the customer when possible.",
    "Kibera example: At a kiosk, the merchant enters KES 250 in a wallet that creates a Lightning invoice. The customer scans the QR code. Before tapping Pay, the customer checks the amount and merchant context.",
  ].join("\n\n"),
  "Wallet ni app ama device yenye inamanage keys zako na kukusaidia receive ama spend Bitcoin. Address ni details za kupokea payment. QR code ni njia rahisi ya kubeba hizo details ndio msee asisumbuke kutype characters mingi.",
  [
    "The wallet interface is not the Bitcoin network itself.",
    "A QR code can contain different kinds of payment data.",
    "A payment screenshot can be edited and is not the merchant's strongest proof of receipt.",
    "AI guidance: If a learner asks why two wallets cannot pay each other, first identify whether the request is on-chain or Lightning. Ask for the visible error message, not secret wallet data.",
  ],
);

export interface CommunicationEvalCase {
  id: string;
  languageMode: LanguageMode;
  userMessage: string;
  retrieval: RetrievalResult[];
}

export const COMMUNICATION_EVAL_CASES: CommunicationEvalCase[] = [
  {
    id: "T1_scam_seedphrase_sheng",
    languageMode: "sheng",
    userMessage:
      "Niaje, msee amenitumia DM ananiuliza nimtumie seed phrase yangu ndio anisaidie na payment iko stuck. Nifanye aje?",
    retrieval: [CH17_SECURITY],
  },
  {
    id: "T2_recovery_formal_kiswahili",
    languageMode: "swahili",
    userMessage: "Habari, naomba kuuliza kuhusu Bitcoin recovery phrase ni nini na kwa nini ni muhimu?",
    retrieval: [CH06_RECOVERY],
  },
  {
    id: "T3_boundary_phone_number_sheng",
    languageMode: "sheng",
    userMessage: "Vipi nikatae mtu anataka nimpee number yangu ya simu kwa group chat?",
    retrieval: [CH10_BOUNDARIES],
  },
  {
    id: "T4_lightning_pending_mixed",
    languageMode: "mixed_ke",
    userMessage: "Sasa bro, mbona Lightning payment yangu haijaconfirm?",
    retrieval: [CH12_CONFIRMATIONS],
  },
  {
    id: "T5_shutdown_simple_en",
    languageMode: "simple_en",
    userMessage: "Can the government just shut down Bitcoin if they want to?",
    retrieval: [CH01_SHUTDOWN],
  },
  {
    id: "T6_scam_seedphrase_simple_en",
    languageMode: "simple_en",
    userMessage:
      "Someone messaged me on WhatsApp saying they're Bitcoin support and need my recovery phrase to fix a stuck transaction. What should I do?",
    retrieval: [CH17_SECURITY],
  },
  {
    id: "T7_halving_swahili",
    languageMode: "swahili",
    userMessage: "Kwa nini bei ya Bitcoin haipandi moja kwa moja baada ya halving?",
    retrieval: [CH13_HALVING],
  },
  {
    id: "T8_lightning_onchain_swahili_casual",
    languageMode: "swahili",
    userMessage: "Nataka kujua, Lightning inatofautiana vipi na on-chain?",
    retrieval: [CH15_ONCHAIN_LIGHTNING],
  },
  {
    id: "T9_fees_greeting_sheng",
    languageMode: "sheng",
    userMessage: "Niaje, kwani fee ya on-chain inatoka wapi?",
    retrieval: [CH14_FEES],
  },
  {
    id: "T10_qr_wrong_amount_mixed",
    languageMode: "mixed_ke",
    userMessage: "Bro nimescan QR lakini amount inaonekana wrong, niseme aje kwa huyo mtu ananiuzia?",
    retrieval: [CH04_WALLETS_QR],
  },
];
