/**
 * Minimal golden retrieval-eval set (added 2026-09-24 following an external
 * audit of this project's approach against industry practice). Standard RAG
 * eval practice calls for a stratified golden set with recall@k as the
 * floor; this project had none beyond ad-hoc spot-checks. At 62 published
 * concept cards, a full RAGAS-style LLM-judge faithfulness pipeline is
 * overkill -- this is the "practical lower bound" version: real user-style
 * questions (mixed English/Sheng/Kiswahili, matching how people actually
 * type, not the knowledge base's own English wording) mapped to the
 * concept card(s) that should be retrieved, checked with a plain recall@k
 * script (runRetrievalEval.ts) against the REAL retrieveKnowledge() path --
 * same hybrid lexical+semantic retrieval production chat uses, not a mock.
 *
 * `expectedConceptIds` lists every concept ID that would count as a correct
 * retrieval for that query -- more than one where genuinely ambiguous
 * (e.g. the manual's own Sheng-titled chapter vs. the original starter-pack
 * entry covering the same ground) rather than arbitrarily picking one and
 * penalizing a correct-but-different hit.
 *
 * Extend this file as real retrieval misses are found in production, the
 * same way SHENG_SYNONYMS in retrieval.ts grew from observed gaps rather
 * than guessed-up-front exhaustive coverage.
 */
export interface RetrievalGoldenCase {
  id: string;
  query: string;
  expectedConceptIds: string[];
}

export const RETRIEVAL_GOLDEN_CASES: RetrievalGoldenCase[] = [
  { id: "R01", query: "Bitcoin ni nini?", expectedConceptIds: ["btc.basics.what_is_bitcoin", "btcman.ch01.bitcoin_ni_nini"] },
  { id: "R02", query: "What exactly is Bitcoin, explain like I'm new to this", expectedConceptIds: ["btc.basics.what_is_bitcoin", "btcman.ch01.bitcoin_ni_nini"] },
  { id: "R03", query: "Bitcoin ni sawa na crypto zingine zote?", expectedConceptIds: ["btc.basics.vs_crypto"] },
  { id: "R04", query: "Nini maana ya sats?", expectedConceptIds: ["btc.basics.what_are_sats", "btcman.ch03.btc_and_sats"] },
  { id: "R05", query: "Ni nani anacontrol Bitcoin?", expectedConceptIds: ["btc.basics.who_controls_bitcoin", "btcman.ch02.why_bitcoin_can_work_without_one_company"] },
  { id: "R06", query: "Serikali inaweza kuizima Bitcoin ama kuifreeze?", expectedConceptIds: ["btc.basics.can_be_shut_down", "btcman.faq.03.can_bitcoin_be_switched_off_by_one_company"] },
  { id: "R07", query: "Kwanini watu wanasema Bitcoin ina thamani, ni pesa ya kubuni tu?", expectedConceptIds: ["btc.basics.why_value"] },
  { id: "R08", query: "Wallet ya Bitcoin ni nini hasa?", expectedConceptIds: ["btc.wallets.what_is_a_wallet", "btcman.ch04.wallets_addresses_and_qr_codes"] },
  { id: "R09", query: "What is a seed phrase and why does it matter?", expectedConceptIds: ["btc.wallets.seed_phrase", "btcman.ch06.recovery_phrases_and_backups"] },
  { id: "R10", query: "Kwanini sipaswi kumwambia mtu seed phrase yangu?", expectedConceptIds: ["btc.wallets.never_share_seed_phrase", "btcman.ch06.recovery_phrases_and_backups"] },
  { id: "R11", query: "Custodial na non-custodial wallet ni tofauti gani?", expectedConceptIds: ["btc.wallets.custodial_vs_noncustodial", "btcman.ch07.self_custody_and_custodial_wallets"] },
  { id: "R12", query: "Nikipoteza simu yangu, Bitcoin zangu zitapotea pia?", expectedConceptIds: ["btc.wallets.lost_phone", "btcman.faq.08.what_if_i_lose_my_phone"] },
  { id: "R13", query: "Private key ina maana gani, na inafanya kazi vipi na signature?", expectedConceptIds: ["btcman.ch05.private_keys_signatures_and_ownership"] },
  { id: "R14", query: "Msee amenitumia DM ananidai nimtumie recovery phrase yangu ndio anisaidie", expectedConceptIds: ["btc.safety.fake_support", "btc.wallets.never_share_seed_phrase", "btcman.ch17.security_and_avoiding_scams"] },
  { id: "R15", query: "What are the most common Bitcoin scams I should watch out for?", expectedConceptIds: ["btc.safety.common_scams", "btcman.ch17.security_and_avoiding_scams"] },
  { id: "R16", query: "Nimetuma Bitcoin kwa address mbaya, nifanye nini?", expectedConceptIds: ["btc.safety.wrong_address"] },
  { id: "R17", query: "Ni njia gani za msingi za kubackup wallet yangu?", expectedConceptIds: ["btc.safety.backup_basics", "btcman.ch06.recovery_phrases_and_backups"] },
  { id: "R18", query: "Nitalipaje kwa duka linalokubali Bitcoin?", expectedConceptIds: ["btc.paying.pay_merchant", "btcman.ch19.customer_payment_flow"] },
  { id: "R19", query: "Naeza rudisha Bitcoin transaction ikishatumwa?", expectedConceptIds: ["btc.paying.reversible", "btcman.faq.06.can_i_reverse_a_bitcoin_payment"] },
  { id: "R20", query: "How do I actually receive Bitcoin from someone?", expectedConceptIds: ["btc.receiving.how_to_receive"] },
  { id: "R21", query: "Ninajuaje kama payment imefanikiwa kupokelewa?", expectedConceptIds: ["btc.receiving.payment_confirmation"] },
  { id: "R22", query: "What is Lightning and how is it different from normal Bitcoin?", expectedConceptIds: ["btc.lightning.what_is_lightning", "btcman.ch15.on_chain_and_lightning_payments"] },
  { id: "R23", query: "Lightning address ni nini?", expectedConceptIds: ["btc.lightning.address"] },
  { id: "R24", query: "Lightning invoice ni tofauti gani na address ya kawaida?", expectedConceptIds: ["btc.lightning.invoice"] },
  { id: "R25", query: "Mbona Lightning payment yangu imefail?", expectedConceptIds: ["btc.lightning.payment_failure"] },
  { id: "R26", query: "Kwanini Lightning ni haraka kuliko on-chain?", expectedConceptIds: ["btc.lightning.why_faster", "btcman.ch15.on_chain_and_lightning_payments"] },
  { id: "R27", query: "Transaction yangu bado iko pending, mbona haijaconfirm?", expectedConceptIds: ["btcman.ch12.confirmations_and_payment_finality", "btcman.faq.05.why_is_my_payment_pending"] },
  { id: "R28", query: "How does a Bitcoin transaction actually move from my wallet to someone else's?", expectedConceptIds: ["btcman.ch08.how_a_bitcoin_transaction_moves"] },
  { id: "R29", query: "Blockchain ni kitu gani, na kila mtu anaeza kuiona?", expectedConceptIds: ["btcman.ch09.the_blockchain_and_public_record"] },
  { id: "R30", query: "Nodes zinafanya kazi gani kwa network ya Bitcoin?", expectedConceptIds: ["btcman.ch10.nodes_rules_and_consensus"] },
  { id: "R31", query: "What is Bitcoin mining and proof of work?", expectedConceptIds: ["btcman.ch11.mining_proof_of_work_and_blocks", "btcman.faq.11.who_creates_new_bitcoin"] },
  { id: "R32", query: "Kuna Bitcoin ngapi zitakazokuwepo, na halving ni nini?", expectedConceptIds: ["btcman.ch13.bitcoin_supply_and_halving"] },
  { id: "R33", query: "Halving ikitokea, bei ya Bitcoin inapanda mara moja?", expectedConceptIds: ["btcman.faq.15.does_a_halving_mean_price_doubles", "btcman.ch13.bitcoin_supply_and_halving"] },
  { id: "R34", query: "Kwanini fee ya on-chain transaction inatofautiana kila wakati?", expectedConceptIds: ["btcman.ch14.transaction_fees", "btcman.faq.10.why_did_the_fee_change"] },
  { id: "R35", query: "Is Bitcoin completely anonymous, can people see what I bought?", expectedConceptIds: ["btcman.ch16.privacy_and_transaction_visibility", "btcman.faq.07.is_bitcoin_anonymous"] },
  { id: "R36", query: "Bei ya Bitcoin inapanda na kushuka sana, ni salama kuiwekeza pesa yangu yote?", expectedConceptIds: ["btcman.ch18.price_volatility_and_responsible_learning"] },
  { id: "R37", query: "Sina lazima kununua Bitcoin nzima moja, ama?", expectedConceptIds: ["btcman.faq.01.do_i_need_to_buy_one_whole_bitcoin", "btc.basics.what_are_sats"] },
  { id: "R38", query: "Can support team recover my wallet if I lose access and it's non-custodial?", expectedConceptIds: ["btcman.faq.04.can_support_recover_my_self_custody_wallet"] },
  { id: "R39", query: "Naeza tumia Bitcoin bila internet kabisa?", expectedConceptIds: ["btcman.faq.14.can_i_use_bitcoin_without_internet"] },
  { id: "R40", query: "Miners wanaeza kuiba Bitcoin yangu wakati wana-process transaction?", expectedConceptIds: ["btcman.faq.12.can_miners_steal_my_bitcoin"] },
];
