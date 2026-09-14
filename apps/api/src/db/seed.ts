import { pool } from "./pool.js";

/**
 * A small starter set from PRD §39, just enough to exercise retrieval → RAG
 * → gateway end-to-end. The real content pack (100–150 entries, reviewed
 * per the Definition of Done in PRD Appendix C) is Phase 0 content work,
 * not something to fabricate wholesale here.
 */
const TOPICS = [
  { id: "bitcoin_basics", title: "Bitcoin Basics" },
  { id: "wallets", title: "Wallets" },
  { id: "lightning", title: "Lightning" },
  { id: "receiving_paying", title: "Receiving and Paying" },
  { id: "safety", title: "Safety" },
];

/** PRD §39 continuation — expanding beyond the original 12-entry starter set. */
const ADDITIONAL_ENTRIES: {
  id: string;
  topicId: string;
  title: string;
  canonicalAnswer: string;
  beginnerAnswer: string;
  safetyNotes?: string[];
}[] = [
  {
    id: "btc.basics.who_controls_bitcoin",
    topicId: "bitcoin_basics",
    title: "Who controls Bitcoin?",
    canonicalAnswer:
      "No single company, government, or person controls Bitcoin. It runs on software followed by thousands of independent computers (nodes) around the world, and changes to the rules require broad agreement across that network.",
    beginnerAnswer:
      "Hakuna kampuni ama serikali moja inayo-control Bitcoin. Inaendeshwa na kompyuta elfu nyingi ulimwenguni zinazofuata sheria zilezile. Kubadilisha sheria hizo kunahitaji makubaliano makubwa, sio mtu mmoja kuamua.",
  },
  {
    id: "btc.basics.why_value",
    topicId: "bitcoin_basics",
    title: "Why does Bitcoin have value?",
    canonicalAnswer:
      "Bitcoin has value because people are willing to accept it in exchange for goods, services, or other currencies, similar to how any money holds value through shared trust and usefulness. Its fixed, predictable supply (a maximum of 21 million bitcoin) also shapes how people value it over time.",
    beginnerAnswer:
      "Bitcoin ina thamani kwa sababu watu wako tayari kuipokea badala ya bidhaa, huduma, ama pesa nyingine — kama pesa yoyote inavyofanya kazi kwa imani na matumizi. Pia, Bitcoin haiwezi kuzidi milioni 21 duniani, na hilo linaathiri thamani yake.",
  },
  {
    id: "btc.basics.vs_crypto",
    topicId: "bitcoin_basics",
    title: "Is Bitcoin the same as crypto?",
    canonicalAnswer:
      "Bitcoin is one specific cryptocurrency — the first and largest — but 'crypto' is a broad category that includes thousands of other coins and tokens with very different designs, purposes, and risk levels. Afribit AI focuses specifically on Bitcoin, not the wider crypto market.",
    beginnerAnswer:
      "Bitcoin ni aina moja tu ya crypto — ndio ya kwanza na kubwa zaidi. 'Crypto' ni jina la jumla la coins na tokens elfu nyingi tofauti, zenye designs na hatari tofauti. Afribit AI inazungumzia Bitcoin peke yake, sio crypto zote.",
  },
  {
    id: "btc.basics.can_be_shut_down",
    topicId: "bitcoin_basics",
    title: "Can Bitcoin be shut down?",
    canonicalAnswer:
      "Because Bitcoin runs on thousands of independent computers spread across many countries rather than one central server, there is no single point to shut down. A government could restrict its use within its own borders, but that is different from being able to switch the network off entirely.",
    beginnerAnswer:
      "Bitcoin haina server moja ya kuizima, kwa sababu inaendeshwa na kompyuta elfu nyingi kote ulimwenguni. Serikali inaweza kuzuia matumizi yake nchini mwao, lakini hilo ni tofauti na kuizima Bitcoin yenyewe kabisa.",
  },
  {
    id: "btc.lightning.why_faster",
    topicId: "lightning",
    title: "Why is Lightning faster?",
    canonicalAnswer:
      "Lightning payments are typically confirmed in seconds because they move through pre-funded payment channels between participants instead of waiting for a new block to be added to the main Bitcoin blockchain each time, which normally takes minutes.",
    beginnerAnswer:
      "Lightning ni haraka kwa sababu malipo yanapita kwa 'channels' zilizowekwa pesa mapema, badala ya kusubiri block mpya kwa blockchain kuu ya Bitcoin — jambo linalochukua dakika kadhaa kila wakati.",
  },
  {
    id: "btc.lightning.address",
    topicId: "lightning",
    title: "What is a Lightning address?",
    canonicalAnswer:
      "A Lightning address looks like an email address (e.g. name@wallet.com) and lets someone receive Lightning payments repeatedly without generating a new invoice for every transaction — the sender's wallet fetches a fresh invoice automatically behind the scenes.",
    beginnerAnswer:
      "Lightning address inaonekana kama email (mfano: jina@wallet.com). Inakuruhusu kupokea malipo mara nyingi bila kutengeneza invoice mpya kila wakati — wallet ya mtu anayekutumia inatengeneza invoice yenyewe nyuma ya pazia.",
  },
  {
    id: "btc.lightning.payment_failure",
    topicId: "lightning",
    title: "Why can a Lightning payment fail?",
    canonicalAnswer:
      "A Lightning payment can fail if there isn't enough liquidity along the route between sender and receiver, if the invoice has expired, or if the receiving wallet is temporarily offline. Most wallets will show a clear failure message, and the sender's funds are not lost — they simply aren't sent.",
    beginnerAnswer:
      "Lightning payment inaweza kufail ikiwa hakuna liquidity ya kutosha njiani, invoice imeisha muda wake, ama wallet ya anayepokea iko offline kwa muda. Wallet yako itakuonyesha imefail, na pesa zako haziishi — hazikutumwa tu.",
  },
  {
    id: "btc.paying.pay_merchant",
    topicId: "receiving_paying",
    title: "How do I pay a merchant?",
    canonicalAnswer:
      "To pay a Bitcoin-accepting merchant, open your wallet's send/scan function, scan the merchant's QR code (an address or Lightning invoice), confirm the amount, and send. Always verify the amount shown in your wallet matches what the merchant expects before confirming.",
    beginnerAnswer:
      "Kulipa merchant, fungua wallet yako, chagua 'send' ama 'scan', scan QR code ya merchant, hakikisha amount ni sahihi, kisha uthibitishe. Hakikisha amount inayoonekana kwa wallet yako inalingana na ile merchant anataka kabla ya kutuma.",
  },
  {
    id: "btc.paying.reversible",
    topicId: "receiving_paying",
    title: "Can a Bitcoin payment be reversed?",
    canonicalAnswer:
      "Once a Bitcoin transaction is confirmed on the network, it cannot be reversed by the sender, the receiver, or any company — there is no central authority who can undo it. This makes it important to double-check addresses and amounts before sending.",
    beginnerAnswer:
      "Ukishatuma na malipo yakathibitishwa (confirmed), huwezi kuyarudisha — hakuna mtu ama kampuni yenye uwezo wa kufuta transaction hiyo. Ndio maana ni muhimu kuangalia address na amount vizuri kabla ya kutuma.",
    safetyNotes: ["Always double-check the address/invoice before sending — Bitcoin payments cannot be reversed."],
  },
  {
    id: "btc.safety.fake_support",
    topicId: "safety",
    title: "Fake support agents",
    canonicalAnswer:
      "Scammers often impersonate wallet or exchange support staff on social media, WhatsApp, or phone calls, asking users to share seed phrases, private keys, or remote-access to their device to 'fix' a problem. Legitimate support never needs any of these to help you.",
    beginnerAnswer:
      "Wezi wengine hujifanya ni support ya wallet ama exchange kwa social media, WhatsApp, ama simu, na kuomba seed phrase, private key, ama remote access ya simu yako ili 'wakusaidie'. Support ya kweli haihitaji vitu hivyo kamwe.",
    safetyNotes: ["No legitimate support agent will ever ask for a seed phrase, private key, or remote device access."],
  },
  {
    id: "btc.safety.wrong_address",
    topicId: "safety",
    title: "Sending to the wrong address or invoice",
    canonicalAnswer:
      "Sending Bitcoin to the wrong address, or paying an invoice for the wrong amount, cannot be undone once confirmed. Always copy addresses by scanning a QR code rather than typing them, and double-check the amount before confirming any payment.",
    beginnerAnswer:
      "Ukituma Bitcoin kwa address isiyo sahihi, ama kulipa invoice ya amount isiyo sahihi, huwezi kurekebisha baada ya kuthibitishwa. Tumia QR code kuchukua address badala ya kuiandika mwenyewe, na hakikisha amount kabla ya kutuma.",
    safetyNotes: ["Scan QR codes instead of typing addresses by hand to avoid costly mistakes."],
  },
  {
    id: "btc.safety.backup_basics",
    topicId: "safety",
    title: "Backup basics",
    canonicalAnswer:
      "For a non-custodial wallet, backing up means safely recording the seed phrase somewhere private and durable — such as writing it on paper and storing it securely — and never as a photo, cloud note, or message. This backup is the only way to recover funds if the device is lost, stolen, or damaged.",
    beginnerAnswer:
      "Kwa wallet ya non-custodial, backup inamaanisha kuandika seed phrase yako mahali salama na binafsi — kama kwa karatasi na kuihifadhi vizuri — sio picha, cloud note, ama ujumbe. Hii ndio njia pekee ya kurudisha pesa zako ukipoteza simu.",
    safetyNotes: ["Never store a seed phrase as a photo, screenshot, cloud note, or message."],
  },
];

const ENTRIES: {
  id: string;
  topicId: string;
  title: string;
  canonicalAnswer: string;
  beginnerAnswer: string;
  safetyNotes?: string[];
}[] = [
  {
    id: "btc.basics.what_is_bitcoin",
    topicId: "bitcoin_basics",
    title: "What is Bitcoin?",
    canonicalAnswer:
      "Bitcoin is decentralized digital money that can be sent directly between people without a bank or central authority in between. Ownership and transfers are recorded on a public ledger (the blockchain) maintained by a global network of computers, not by a single company or government.",
    beginnerAnswer:
      "Bitcoin ni digital money yenye unaweza kusend direct kwa mtu mwingine bila bank kuwa katikati. Unaweza kuituma, kuipokea, ama kuitumia kulipa. Small units zake zinaitwa sats.",
  },
  {
    id: "btc.basics.what_are_sats",
    topicId: "bitcoin_basics",
    title: "What are sats?",
    canonicalAnswer:
      "A satoshi (sat) is the smallest unit of Bitcoin: 100,000,000 sats make one Bitcoin. Sats let people transact in small, practical amounts without needing to own a whole Bitcoin.",
    beginnerAnswer:
      "Sats ni units ndogo za Bitcoin. Bitcoin moja ina sats milioni mia (100,000,000). Hauhitaji kununua Bitcoin nzima — unaweza tumia sats chache tu.",
  },
  {
    id: "btc.wallets.what_is_a_wallet",
    topicId: "wallets",
    title: "What is a Bitcoin wallet?",
    canonicalAnswer:
      "A Bitcoin wallet is an app or device that manages the keys needed to receive, hold, and send bitcoin. It doesn't store coins like a physical wallet — it stores the keys that prove and control ownership.",
    beginnerAnswer:
      "Wallet ni app ama kifaa cha kutunza funguo (keys) zinazokuruhusu kupokea, kutunza, na kutuma Bitcoin. Sio kama wallet ya pesa za kawaida — inatunza 'ufunguo' wa access yako.",
  },
  {
    id: "btc.wallets.custodial_vs_noncustodial",
    topicId: "wallets",
    title: "Custodial vs non-custodial wallets",
    canonicalAnswer:
      "A custodial wallet means a company holds your keys on your behalf, similar to a bank. A non-custodial wallet means you control your own keys directly. Non-custodial gives more control but more personal responsibility for backups and security.",
    beginnerAnswer:
      "Custodial wallet: company ndio inashikilia keys zako, kama bank. Non-custodial: wewe mwenyewe unashikilia keys zako. Non-custodial inakupa control zaidi, lakini wajibu wa kutunza backup ni wako.",
  },
  {
    id: "btc.wallets.seed_phrase",
    topicId: "wallets",
    title: "What is a seed phrase?",
    canonicalAnswer:
      "A seed phrase is a list of words (usually 12 or 24) generated by a non-custodial wallet that can restore full access to the funds it controls. Anyone who has it can access the funds, which is why it must never be shared.",
    beginnerAnswer:
      "Seed phrase ni maneno (kawaida 12 ama 24) ambazo wallet yako inakupatia. Maneno hayo yanaweza kurudisha access ya pesa zako popote. Mtu yeyote mwenye maneno hayo anaweza kutumia pesa zako — kwa hivyo usimwambie mtu yeyote.",
    safetyNotes: ["Never share a seed phrase with anyone, including anyone claiming to be support."],
  },
  {
    id: "btc.wallets.never_share_seed_phrase",
    topicId: "wallets",
    title: "Why should I never share my seed phrase?",
    canonicalAnswer:
      "Anyone with your seed phrase has full, irreversible access to the funds it protects. No legitimate wallet provider, exchange, or support agent will ever ask for it. Requests for a seed phrase are a scam indicator.",
    beginnerAnswer:
      "Mtu akipata seed phrase yako, anaweza kuchukua pesa zako zote bila wewe kujua na huwezi kurudisha. Hakuna support wa kweli atakayekuuliza seed phrase yako. Mtu akikuuliza, huyo ni mwizi.",
    safetyNotes: ["Never request or store a seed phrase.", "Treat any seed phrase request as a scam attempt."],
  },
  {
    id: "btc.wallets.lost_phone",
    topicId: "wallets",
    title: "What happens if I lose my phone?",
    canonicalAnswer:
      "If your wallet is non-custodial and you have your seed phrase backed up safely, you can restore your funds on a new device using that seed phrase. If you never backed it up, the funds are likely unrecoverable. Custodial wallets can usually be recovered through the provider's account-recovery process instead.",
    beginnerAnswer:
      "Kama una seed phrase yako imehifadhiwa mahali salama, unaweza kurudisha pesa zako kwa simu mpya. Kama hukuhifadhi seed phrase, huenda pesa zikawa hazipatikani tena. Kama wallet yako ni custodial (ya company), tumia mchakato wao wa kurudisha account.",
  },
  {
    id: "btc.lightning.what_is_lightning",
    topicId: "lightning",
    title: "What is Lightning?",
    canonicalAnswer:
      "Lightning is a payment network built on top of Bitcoin that enables near-instant, low-fee transactions by settling many payments off the main Bitcoin blockchain and only periodically anchoring to it.",
    beginnerAnswer:
      "Lightning ni njia ya kutuma Bitcoin haraka sana na kwa fee ndogo. Badala ya kila transaction kuandikwa moja kwa moja kwa blockchain kuu, Lightning inatumia njia ya haraka kisha inaunganisha na blockchain mara kwa mara.",
  },
  {
    id: "btc.lightning.invoice",
    topicId: "lightning",
    title: "What is a Lightning invoice?",
    canonicalAnswer:
      "A Lightning invoice is a one-time payment request generated by the receiver, encoding the amount and destination. The payer's wallet scans or pastes it to send the exact payment.",
    beginnerAnswer:
      "Lightning invoice ni kama request ya malipo inayotengenezwa na mtu anayetaka kulipwa. Ina amount na destination. Wewe unayelipa unascan ama unapaste invoice hiyo kwa wallet yako ili kulipa.",
  },
  {
    id: "btc.receiving.how_to_receive",
    topicId: "receiving_paying",
    title: "How do I receive Bitcoin?",
    canonicalAnswer:
      "To receive Bitcoin, open your wallet, generate a receiving address or Lightning invoice, and share it with the sender (directly or via QR code). Once the sender confirms and the network processes it, the funds appear in your wallet.",
    beginnerAnswer:
      "Naeza receive Bitcoin aje? Fungua wallet yako, tengeneza receiving address ama Lightning invoice, kisha impe mtu anayetaka kukutumia (moja kwa moja ama kwa QR code). Akishatuma, utaona pesa kwa wallet yako.",
  },
  {
    id: "btc.receiving.payment_confirmation",
    topicId: "receiving_paying",
    title: "How do I know payment succeeded?",
    canonicalAnswer:
      "Your wallet will show the incoming transaction, first as pending/unconfirmed and then as confirmed once the network validates it (for on-chain payments) or instantly for successful Lightning payments. Always confirm within your own wallet rather than trusting a screenshot or verbal claim from the payer.",
    beginnerAnswer:
      "Wallet yako itaonyesha malipo yamefika — kwanza kama 'pending' kisha 'confirmed'. Kwa Lightning, kawaida ni haraka sana. Angalia kwa wallet yako mwenyewe, sio screenshot ama maneno tu kutoka kwa mtu anayelipa.",
  },
  {
    id: "btc.safety.common_scams",
    topicId: "safety",
    title: "Common Bitcoin scams",
    canonicalAnswer:
      "Common scams include fake giveaways promising to double any Bitcoin sent, impersonation of support agents asking for seed phrases or remote access, fake payment confirmations, and guaranteed-profit investment schemes. Legitimate services never ask for your seed phrase and rarely if ever guarantee returns.",
    beginnerAnswer:
      "Scam za kawaida: mtu anasema akipewa Bitcoin atarudisha mara mbili (giveaway bandia), mtu anajifanya support na anataka seed phrase yako, mtu anasema amelipa lakini hakulipa, ama mtu anaahidi utapata faida kubwa bila hatari. Usiamini ahadi za namna hiyo.",
    safetyNotes: ["Guaranteed-return offers and requests for seed phrases are scam indicators."],
  },
];

const ALL_ENTRIES = [...ENTRIES, ...ADDITIONAL_ENTRIES];

async function seed(): Promise<void> {
  for (const topic of TOPICS) {
    await pool.query(
      `INSERT INTO knowledge_topics (id, domain, title) VALUES ($1, 'bitcoin', $2)
       ON CONFLICT (id) DO NOTHING`,
      [topic.id, topic.title],
    );
  }

  for (const entry of ALL_ENTRIES) {
    await pool.query(
      `INSERT INTO knowledge_entries (id, topic_id, title, canonical_answer, beginner_answer, safety_notes, status, reviewed_by, reviewed_at, valid_from)
       VALUES ($1, $2, $3, $4, $5, $6, 'published', 'seed_script', now(), now())
       ON CONFLICT (id) DO UPDATE SET
         canonical_answer = EXCLUDED.canonical_answer,
         beginner_answer = EXCLUDED.beginner_answer,
         safety_notes = EXCLUDED.safety_notes`,
      [entry.id, entry.topicId, entry.title, entry.canonicalAnswer, entry.beginnerAnswer, JSON.stringify(entry.safetyNotes ?? [])],
    );
  }

  console.log(`Seeded ${TOPICS.length} topics and ${ALL_ENTRIES.length} knowledge entries.`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
