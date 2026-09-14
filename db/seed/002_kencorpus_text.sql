-- Bootstrap import: KenCorpus Kiswahili text corpus (PRD §13, round-2 recheck)
--
-- Source:        Kencorpus (Wanjawa, Wanzare, Indede, McOnyango, Ombui,
--                 Muchemi — Maseno University / University of Nairobi /
--                 Africa Nazarene University, Lacuna Fund-supported).
--                 Round 1 (2026-09-14) could not reach
--                 kencorpus.maseno.ac.ke and skipped this source entirely.
--                 Round 2 confirmed TWO independently reachable, real
--                 mirrors:
--                   1. Hugging Face: huggingface.co/datasets/Kencorpus/KenCorpus_text
--                      (not gated; verified via the HF datasets-server API,
--                      which returned real rows — parquet, 3,787 rows,
--                      7 columns: text/language/genre/source/title/
--                      story_id/source_type).
--                   2. Harvard Dataverse DOI 10.7910/DVN/6N5V1K
--                      ("Kencorpus: Kenyan Languages Corpus") — confirmed
--                      live via the Dataverse API: CC BY 4.0, unrestricted,
--                      4,800+ files (text + ~176 hours of audio across
--                      Swahili/Dholuo/Luhya-Bukusu/Luhya-Marachi/
--                      Luhya-Logooli). A second, related Dataverse entry,
--                      DOI 10.7910/DVN/KLCKL5 ("KenPos: Kenyan Languages
--                      Part of Speech Tagged dataset"), is also real and
--                      CC BY 4.0 but was not used for this import — it is
--                      POS-tagged data, not the plain text corpus.
-- License:       CC BY 4.0, confirmed independently on both the HF
--                 dataset's own `cardData`/README ("## License \n
--                 **CC-BY-4.0**") and the Dataverse API's own
--                 `latestVersion.license` field
--                 (http://creativecommons.org/licenses/by/4.0) for both
--                 DOIs above.
-- Attribution:    "Text data from KenCorpus (Wanjawa et al., 2022,
--                 arXiv:2208.12081; huggingface.co/datasets/Kencorpus/
--                 KenCorpus_text; Harvard Dataverse DOI 10.7910/DVN/6N5V1K),
--                 CC BY 4.0." Individual entries below also carry their
--                 own nested attribution where KenCorpus itself sourced
--                 them from the African Storybook project
--                 (www.africanstorybook.org, also CC BY-licensed
--                 children's stories) — see each row's `title`.
-- Human/Synthetic: Human-authored. Per the HF dataset card, "Primary data
--                 was collected from respective language communities,"
--                 i.e. student compositions, community writers, and (for
--                 the rows below specifically) African Storybook's
--                 published open-license children's books. Not scraped
--                 without consent and not LLM-generated.
--
-- Corpus layer: L0_reference (per docs/LANGUAGE_CORPUS.md, which already
-- names "raw KenCorpus text" as the canonical L0 example — informational
-- reference text, not conversational Sheng/code-switch data). This is
-- Kiswahili, NOT Sheng: `style='swahili'` throughout, never 'sheng'.
--
-- PRD §13.6 ingestion-rule status for THIS bootstrap batch:
--   1. License review        — done (CC BY 4.0, confirmed on both HF and
--                               Dataverse independently, see above).
--   2. Provenance review     — done. Rows are full short texts (poems,
--                               beginner-reader stories), not single
--                               dictionary words — closer to the PRD
--                               §12.2 "complete utterance" ideal than
--                               001_lughakonnect_sheng.sql's vocabulary
--                               entries, though still prose/reference
--                               text rather than conversational chat turns.
--   3. Sampling/quality      — DONE, with a deliberate content filter: of
--                               ~2,900 Swahili rows sampled from the HF
--                               parquet (first ~1,000 rows checked), this
--                               batch keeps only `genre` in
--                               ('Poetry','Creative_writing') and length
--                               60-500 chars, explicitly EXCLUDING 'News'
--                               genre rows after spotting that some News/
--                               obituary-style entries in this corpus name
--                               real private individuals (e.g. a death
--                               announcement with full family details, in
--                               a different language config) — a PII risk
--                               this batch avoids by genre selection rather
--                               than per-row redaction. Two poems
--                               ("Nipendacho mimi", "Hamu ya maisha") are
--                               original community creative writing; the
--                               other 26 rows are African Storybook
--                               beginner-reader stories (fictional
--                               characters/generic vocabulary, e.g. "Fana",
--                               "Josia", "Manyati" — no real persons). One
--                               near-duplicate story (story_id 2467/2468,
--                               same "Ulemavu si utepetevu" text with only
--                               whitespace differences) was de-duplicated,
--                               keeping only story_id 2467.
--   4. Bias/context review   — not done; draft status + human review
--                               queue is for exactly this.
--   5. Duplication check     — not run against existing language_entries
--                               beyond the internal de-dup above; the
--                               WHERE NOT EXISTS guard below only prevents
--                               re-inserting this same batch on repeat runs.
--   6. PII check             — done at genre-selection level (see #3);
--                               no row here names a real private
--                               individual. `no meaning translation
--                               available` — KenCorpus rows are Kiswahili
--                               source text without paired English
--                               glosses, so `meaning` is NULL throughout
--                               (unlike LughaKonnect's word-for-word
--                               glosses).
--   7. Afribit approval      — NOT granted. Every row below is inserted
--                               with status='draft'.
--
-- Safe to re-run: the anti-join on (utterance, source_context) skips rows
-- already inserted by a previous run of this script.
--
-- Provenance/quality-tier fields (docs/LANGUAGE_CORPUS.md): licensed
-- external human text with no Afribit review yet, so afribit_reviewed
-- stays false and allowed_for_rag/allowed_for_training stay false.
-- allowed_for_evaluation is true, following the same reasoning as
-- 001_lughakonnect_sheng.sql (licensed human-sourced text is a reasonable
-- eval/stress-test signal even before review).

INSERT INTO language_entries (
  utterance, intent, meaning, style, source_context,
  naturalness_score, status, freshness, contributor_key,
  corpus_layer, source, source_type, license,
  human_authored, synthetic, afribit_reviewed, quality_tier,
  allowed_for_rag, allowed_for_training, allowed_for_evaluation
)
SELECT
  v.utterance,
  NULL,
  NULL,
  'swahili',
  'public_dataset:kencorpus',
  NULL,
  'draft',
  'current',
  NULL,
  'L0_reference',
  'kencorpus',
  'external_human',
  'CC-BY-4.0',
  TRUE,
  FALSE,
  FALSE,
  'unrated',
  FALSE,
  FALSE,
  TRUE
FROM (VALUES
  ('NIPENDACHO MIMI
Kwangu ninachokipenda ni hii,
Mengi mambo yakiwa sahihi
 Hasa nisomapo Kazi za fasihi,

Kupanga nyumba hasa kwa ustadi,
Yaonekane kweli kila kitu maridadi,
Kamwe kuepukana na hayo maadhi.

Kusozana mle Kamwe sipendi,
Mambo yangu yawe ya utendi,
Kila muda amani iwe kipindi.

Kifaa nilichonacho hasa kutunza,
ila hicho kisiwe kama funza,
Inayopenda mambo hasa Kufyonza.

Maisha mazuri hakika huapania,
Kamwe sitakoma hata kupigania,
Hata kama kukosa nia na njia.', 'Nipendacho mimi', '428'),
  ('HAMU YA MAISHA
Mengi ninayo moyoni mwangu,
Hasa kuhusu maisha yangu,
Mengino ya hayo si Maajabu,
labda nawe unayo Mwanangu.
Ziwe Kimnya mtimani

Kuhusu hii ya Pendo nilonalo,
Siku hizi kweli mambo si hayo,
Hamu na ghamu Imenikumbalo.
sijui kwa ukiwa wote nilonao.
Kweli Kizunguzungu kwangu nyayo.

Kila sichana naonao mrembo,
Hali kavutiwa Kama nembo,
Ama mie Kanywa tembo,
Lakini nifanyeje hali masomo
Hii naona itakuwa ndwele moyo.', 'Hamu ya maisha', '429'),
  ('Bustani ya  Mama

Mama yangu ana  bustani ndogo.  Anapenda kukuza  mimea tofauti.
Ninapenda  kuitembelea  bustani hii asubuhi  kuvuna  kilichokomaa.
Kuna maua.
Kuna dania.
Kuna oregano.
Kuna malenge.
Kuna tango.
Kuna nyanya.
Kuna stroberi.
Kuna ndimu.
Kuna vitunguu.
Kuna saladi.
Kuna sukuma wiki.
Kuna pia, viazi  katika bustani ya  mama yangu.
Mama hupika lishe  bora kwa kutumia  mazao ya bustani  yake maridadi.', 'Bustani ya Mama', '2199'),
  ('Familia

Baba
Mtoto
Mama na mtoto
Dada na kaka
Mama, kaka na  dada', 'Familia', '2211'),
  ('Familia yangu

Mimi ni Maria.
Huyu ni mama  yangu.
Huyu ni mtoto.
Huyu ni baba  yangu.
Huyu ni kaka  yangu.
Huyu ni dada  yangu.
Huyu ni bibi yangu.
Huyu ni babu  yangu.
Huyu ni mjomba  wangu.
Huyu ni shangazi  yangu.
Hii ni familia  yangu.', 'Familia yangu', '2213'),
  ('Fana  anawapenda  wanyama

Fana na familia  yake wanaishi  mjini.
Fana ana paka,  kuku wawili, mbuzi  na njiwa.
Siku moja Fana  aliwaona watoto  wakiwarushia  njiwa mawe.
Fana alikimbia  akisema, "Acheni  kutupa mawe."
Fana aliwachukua  wale njiwa  akawapeleka  nyumbani.
Aliwalisha.  Aliwaambia wazazi  vile alivyowaokoa.
Fana na wazazi  wake waliwapeleka  njiwa kutibiwa.
Fana huwaambia  wenzake,  "Wanyama ni  marafiki zetu.  Tunawalinda."', 'Fana anawapenda wanyama', '2214'),
  ('Furaha na  Huzuni

Kwa nini mtoto  analia?
Labda ana njaa.
Kwa nini  mvulana huyu  amehuzunika?
Labda anamkosa  baba yake.
Kwa nini msichana  huyu amefurahi?
Kwa sababu  amepata rinda  jipya.
Kwa nini mzee  huyo anacheka?
Kwa sababu  amesoma  kichekesho.
Kwa nini  mama huyu  anatabasamu?
Watoto wake  wanasoma kimya  kimya.
Mbona mama  huyu anatazama  chini?
Anaona haya.', 'Furaha na Huzuni', '2225'),
  ('Je, Wanafanya  Nini?

Kuendesha
Kutupa na  kukamata
Kuviringisha
Kukimbia na  kufukuza
Kuzungusha
Kuruka na  kupinduka
Kupiga
Kucheza na  kutazama
Kubeba
Kucheza dansi', 'Je  Wanafanya Nini', '2235'),
  ('Jinsi Kobe  alivyopata pua  kombo (Paka  rangi)

Kobe na Kindi  wanahitaji pesa.
Wanatengeneza  sahani ili wauze  sokoni.
Kobe anashuhudia  vita sokoni.
Kindi na Fuko  wanapigana.
"Mwache rafiki  yangu," Kobe  anapiga mayowe.
Fuko anamuuma  Kobe kwenye pua.
Pua lake  lililovunjika  linaumia sana.
Kobe ana pua  kombo kwa kuwa  na haraka ya  kupigana.', 'Jinsi Kobe alivyopata pua kombo (Paka rangi)', '2240'),
  ('Josia ananunua kinywaji

Kuna duka ndogo karibu na nyumba yangu.
Mmiliki wa duka hilo ni mwanamume  mwembamba mwenye sauti ndogo.
Nje kuna joto.  Ninakwenda kwenye friji.  Ninapata kinywaji cha stroberi.
Ninampatia mwanamume huyo mwembamba  pesa zangu.
Kisha, ninafungua kinywaji changu cha stroberi na  kuanza kunywa.
Kinywaji hicho baridi cha stroberi kina ladha tamu  sana!', 'Josia ananunua kinywaji', '2244'),
  ('Maharagwe Yanayomea

Kwanza, mzizi  unamea.
Mzizi unaingia  chini ya udongo.
Halafu, shina  linaanza kukua.  Linaelekea juu  kwenye jua.
Majani yanaanza  kuota.
Mmea unakuwa  mrefu zaidi.
Kisha maua  yanatokezea.  Maua hugeuka na  kuwa maharagwe.
Kuna mbegu nyingi  ndani ya ganda.', 'Maharagwe Yanayomea', '2264'),
  ('Mama yangu

Huyu ni mimi.
Ninaishi na mama,  kaka na dada  yangu.
Mama yangu  anapenda kupika.
Wakati mwingine,  mama yangu  huwatembelea  marafiki zake.
Anapokuwa huko,  mimi husafisha  nyumba na kuosha  sahani.
Usiku, mama  yangu hutwambia  tusali.
Siku yangu ya  kuzaliwa ifikapo,  mama yangu  huniletea zawadi.
Ninampenda  mama yangu.', 'Mama yangu', '2268'),
  ('Mamba  aliyekuwa na  njaa

Wakati mmoja  palikuwa na  mamba aliyekuwa  na njaa.
Alikitafuta chakula  polepole tena  kimya kimya.
Halafu.
PUU! Mamba  alishambulia!
Baadaye, hakuwa  na njaa tena.  Alifurahi.
Alitulia hadi  alipohisi njaa tena.', 'Mamba aliyekuwa na njaa', '2271'),
  ('Manyati na  wanyama wake

Huyu ni Manyati  na wanyama wake.
Ng''ombe wake  anampatia  maziwa.
Mbuzi wake naye  anampatia nyama.
Naye farasi wake  anamsafirisha.
Nguruwe naye  anampatia nyama  ya nguruwe.
Kuku anampatia  mayai.
Mbwa wake  anamlinda.
Manyati  anawatunza wote!', 'Manyati na wanyama wake', '2275'),
  ('Matunda na  Mboga

Pilipili
Kabeji
Malenge
Mbaazi
Pichi
Ndizi
Stroberi
Tikitimaji
Passioni
Maharage ya Kijani
Pilipili Hoho
Bamia
Mboga ya Saladi
Mahindi
Mbilingani
Nyanya
Karoti
Nanasi
Papai
Parachichi
Embe
Tofaa
Mapera
Viazi Vitamu
Tangawizi
Kitunguu Saumu
Vitunguu
Viazi
Machungwa
Limau
Radishi
Chenza
Cheri
Zabibu', 'Matunda na Mboga', '2283'),
  ('Mbili

Mikono miwili ya  kukamata.
Matawi mawili ya  mti.
Watoto wawili  wanaocheza  pamoja.
Masikio mawili ya  sungura.
Macho mawili ya  kuona.
Picha iliyo na watu  wawili.
Binadamu wawili  wanasoma kitabu  pamoja.
Masikio mawili ya  kusikia.
Mikono miwili ya  kukumbatia!
Miguu miwili ya  kusimamia.', 'Mbili', '2287'),
  ('Nywele

Terry ana nywele  fupi.
Anna ana nywele  ndefu.
Kate ana nywele  ndefu zaidi.
Dama amesuka  nywele zake.
Baba ana ndevu.
Sara amechana  nywele zake.
Toni amekata  nywele zake.
Tim amenyoa  nywele zake.', 'Nywele', '2397'),
  ('Nzito na  nyepesi

Ni kipi kizito zaidi?  Kuku au unyoya?
Ni kipi chepesi  zaidi?  Ua au hindi?
Mtoto yupi ni mzito  zaidi?
Ni nani mzito zaidi,  ndovu au baba?
Ni kipi kizito zaidi,  kilo moja ya mawe?
Au gramu moja ya  saruji?
Ni kipi kizito zaidi?  Kilo moja ya  sukari?
Au kilo moja ya  manyoya?', 'Nzito na nyepesi', '2398'),
  ('Sare za shule

Rinda hili ni refu.
Sweta hii ni kubwa.
Mkoba huu ni  mkubwa.
Mshipi huu ni  mfupi.
Kofia hii ni ndogo.
Soksi hizi ni fupi.
Lakini, viatu hivi ni  vipya.
Vinanitosha vizuri.', 'Sare za shule', '2426'),
  ('Sehemu za  mwili

Huu ni unyayo.
Huu ni mguu.
Hili ni goti.
Hiki ni kiuno.
Hii ni tumbo.
Hiki ni kifua.
Hivi ni viganja.
Hii ni mikono.
Hiki ni kiwiko.
Hiki ni kichwa.', 'Sehemu za mwili', '2428'),
  ('Taja Rangi

Kwa nini mbingu ni  ya rangi ya bluu?
Je, huwa bluu kila  wakati?
Kwa nini rangi ya  majani ni kijani  kibichi?
Majani si kijani  kibichi kila wakati.
Kwa nini ndizi  mbivu ni manjano?
Ndizi mbichi ni za  kijani.
Kwa nini mwavuli  ni mweusi?
Miavuli yote si  mieusi.
Kwa nini damu ni  nyekundu?
Kuna madini  kwenye damu.  Yanaipatia damu  rangi nyekundu.
Kwa nini chumvi ni  nyeupe?
Sifahamu!', 'Taja Rangi', '2450'),
  ('Ulemavu si  utepetevu

Huyu ni Agnes.  Yeye ni mwalimu.
Agnes hutumia  magongo  kutembea.
Huyu ni Metobo.  Metobo ni DJ wa  redio nimpendaye.
Metobo ana tatizo  la macho.
Huyu ni jirani  yangu Moraa.  Moraa ni mkulima.
Moraa hasikii. Yeye  hutumia lugha ya  ishara kuwasiliana.
Huyu ni Osero.  Osero ni mchezaji  wa soka maarufu  shuleni kwetu.
Osero hana  mikono. Lakini,  yeye huingizia  mabao mengi timu  yetu inapocheza.', 'Ulemavu si utepetevu', '2467'),
  ('Umuhimu wa Mtende

Hebu nikueleze  kuhusu mtende.
Mtende ni mmea  wa kudumu.  Unasitawi mimea  mingine  inapokauka.
Kivuli cha mtende  kina upepo mzuri.
Tunakula matunda  ya mtende.
Tunatumia majani  yake kuezeka  nyumba zetu.
Tunatengeneza  fagio kutumia  majani ya mtende.  Tunasuka mikeka  pia.
Tunatumia nafaka  zake kupika.
Sasa umefahamu  kwa nini mtende ni  muhimu sana?', 'Umuhimu wa Mtende', '2471'),
  ('Unafanya Nini?

Ninaimba.
Ninapunga mkono.
Ninashangilia.
Ninajinyoosha.
Ninaongea.
Ninacheka.
Ninashangaa.
Je, unafanya nini?', 'Unafanya Nini', '2472'),
  ('Uso Kutafsiri Biblia Mara

Macho
Sikio
Mdomo
Pua
Kidevu
Meno
Ulimi
Mashavu
Kope
Nywele', 'Uso', '2478'),
  ('Vifungo

Vifungo vyangu  vyote ni duara.
Baadhi ya vifungo  vyangu ni kijani  kibichi.
Vifungo vyangu  vyote ni vidogo.
Baadhi ya vifungo  vyangu ni  manjano.
Vifungo vyangu  vyote in maridadi.
Baadhi ya vifungo  vyangu ni vya rangi  nyekundu.
Vifungo vyangu  vyote  vinameremeta.
Baadhi ya vifungo  vyangu ni bluu.
Vifungo vyangu  vyote ni vizuri.
Ninavipenda  vifungo vyangu  vyote.', 'Vifungo', '2483'),
  ('Vituko vya  Ng''ombe Shujaa

Huyu ni  ng''ombe mtulivu.
Mchana yeye ni  ng''ombe wa  kawaida.
Hupeperusha tiara.
Au kucheza mpira.
Usiku yeye  hubadilika na  kuwa Ng''ombe  Shujaa.
Yeye huokoa  maisha.
Na kupambana na  uhalifu.
Wewe pia  ukiyafumba macho  yako kabisa, kisha  uwe na hamu  kubwa.
Huenda ng''ombe  akakutembelea  pia!', 'Vituko vya Ng ombe Shujaa', '2486'),
  ('Wanyama Kutafsiri Biblia  Mara

Mbwa
Bata
Ng''ombe
Punda
Panya
Paka
Kondoo
Mbuzi
Nguruwe
Kuku', 'Wanyama', '2492')
) AS v(utterance, title, story_id)
WHERE NOT EXISTS (
  SELECT 1 FROM language_entries le
  WHERE le.utterance = v.utterance
    AND le.source_context = 'public_dataset:kencorpus'
);
