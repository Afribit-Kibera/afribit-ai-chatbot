import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  BookOpen,
  Globe,
  Code2,
  Lock,
} from "lucide-react";
import { BrandMark } from "./BrandMark.js";
import { I18nProvider, useI18n } from "../lib/i18n.js";
import type { Locale } from "../lib/preferences.js";
import sample from "../content/sample-answer.json";
import { PrivacyContent } from "./PrivacyContent.js";
const SOURCE_URL = "https://github.com/Afribit-Kibera/afribit-ai-chatbot";
const sampleAnswer = sample.answer;
export function PublicSite({ path }: { path: string }) {
  const locale: Locale = path.startsWith("/sw")
    ? "sw"
    : path.startsWith("/sh")
      ? "sh"
      : "en";
  return (
    <I18nProvider locale={locale}>
      <div className="public-site">
        <PublicPage path={path} />
      </div>
    </I18nProvider>
  );
}
function PublicPage({ path }: { path: string }) {
  const { t, locale, reviewPending } = useI18n();
  const [question, setQuestion] = useState(t("demo.question"));
  const isPrivacy = path.endsWith("/privacy");
  const isCommunity = path.endsWith("/community");
  const home = locale === "en" ? "/" : `/${locale}/`;
  const questionLink = `/app?question=${encodeURIComponent(question.trim() || t("demo.question"))}`;
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("nav.skip")}
      </a>
      <header className="public-header wrap">
        <a className="brand-link" href={home} aria-label={t("nav.home")}>
          <BrandMark />
        </a>
        <nav aria-label={t("nav.label")} className="public-nav">
          <a href={`${home}#how-it-works`}>{t("nav.how")}</a>
          <a href={`${home}#community`}>{t("nav.community")}</a>
          <a href={`${home}#faq`}>{t("nav.faq")}</a>
        </nav>
        <div className="header-actions">
          <label className="locale-select">
            <Globe size={16} aria-hidden="true" />
            <span className="sr-only">{t("common.uiLanguage")}</span>
            <select
              aria-label={t("common.uiLanguage")}
              value={locale}
              onChange={(e) =>
                window.location.assign(
                  e.target.value === "en" ? "/" : `/${e.target.value}/`,
                )
              }
            >
              <option value="en">EN</option>
              <option value="sw">SW</option>
              <option value="sh">SH</option>
            </select>
          </label>
          <a className="button button-outline" href="/app">
            {t("nav.open")}
            <ArrowUpRight size={17} />
          </a>
        </div>
      </header>
      {reviewPending && (
        <p className="translation-note wrap" role="status">
          {t("common.translationNote")}
        </p>
      )}
      <main id="main-content">
        {isPrivacy ? (
          <article className="legal-page wrap">
            <span className="eyebrow">{t("privacy.draft")}</span>
            <PrivacyContent />
            <a className="text-link" href={home}>
              {t("privacy.back")}
              <ArrowRight size={16} />
            </a>
          </article>
        ) : isCommunity ? (
          <section className="node-page wrap">
            <span className="eyebrow">{t("community.eyebrow")}</span>
            <h1>{t("node.title")}</h1>
            <p className="lead">{t("node.intro")}</p>
            <p>{t("community.nodeBody")}</p>
            <p>{t("node.requirements")}</p>
            <p>{t("node.disclosure")}</p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href={`${SOURCE_URL}/blob/master/docs/program/community-node.md`}
              >
                {t("node.docs")}
                <ArrowUpRight size={16} />
              </a>
              <a
                className="text-link"
                href={`${SOURCE_URL}/tree/master/deploy/community-node`}
              >
                {t("node.kit")}
                <ArrowUpRight size={16} />
              </a>
            </div>
            <a
              className="text-link"
              href="mailto:eddie@afribit.africa?subject=Community%20node"
            >
              {t("community.host")}
              <ArrowRight size={16} />
            </a>
          </section>
        ) : (
          <>
            <section className="hero wrap" aria-labelledby="hero-heading">
              <div className="hero-copy">
                <p className="eyebrow">{t("landing.eyebrow")}</p>
                <h1 id="hero-heading">
                  {t("landing.heroTitle1")}
                  <br />
                  {t("landing.heroTitle2")}
                  <br />
                  <span>{t("landing.heroTitle3")}</span>
                </h1>
                <p className="hero-description">
                  {t("landing.heroDescription")}
                </p>
                <div className="hero-actions">
                  <a className="button button-primary" href="/app">
                    {t("landing.cta")}
                    <ArrowUpRight size={19} />
                  </a>
                  <a className="text-link" href="#how-it-works">
                    {t("nav.how")}
                    <ArrowRight size={17} />
                  </a>
                </div>
                <p className="quiet">
                  {t("landing.noAccount")} {t("landing.limit")}
                </p>
              </div>
              <div
                className="language-panel"
                aria-label="Sheng, Kiswahili and English"
              >
                <span className="panel-index">{t("panel.eyebrow")}</span>
                <div className="language-panel-type">
                  Sheng.
                  <br />
                  Kiswahili.
                  <br />
                  English.
                </div>
                <div className="language-panel-bottom">
                  <p>
                    {t("panel.line1")}
                    <br />
                    {t("panel.line2")}
                  </p>
                  <img
                    src="/brand/afribit-mark-icon.png"
                    alt=""
                    width="52"
                    height="62"
                  />
                </div>
              </div>
            </section>
            <section className="benefits wrap" aria-label="About Afribit AI">
              <div>
                <span className="benefit-number">01</span>
                <h2>{t("landing.languageTitle")}</h2>
                <p>{t("landing.languageBody")}</p>
              </div>
              <div>
                <span className="benefit-number">02</span>
                <h2>{t("landing.reviewTitle")}</h2>
                <p>{t("landing.reviewBody")}</p>
              </div>
              <div>
                <span className="benefit-number">03</span>
                <h2>{t("landing.paceTitle")}</h2>
                <p>{t("landing.paceBody")}</p>
              </div>
            </section>
            <section className="demo wrap" aria-labelledby="demo-title">
              <div className="demo-intro">
                <p className="eyebrow">{t("demo.eyebrow")}</p>
                <h2 id="demo-title">{t("demo.title")}</h2>
                <span className="demo-label">{t("demo.label")}</span>
              </div>
              <div className="demo-chat">
                <form className="demo-composer" action="/app">
                  <label className="sr-only" htmlFor="demo-input">
                    {t("chat.messageLabel")}
                  </label>
                  <input
                    id="demo-input"
                    name="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t("demo.prompt")}
                    maxLength={2000}
                  />
                  <button
                    className="button button-primary icon-button"
                    type="submit"
                    aria-label={t("demo.send")}
                    onClick={(e) => {
                      if (!question.trim()) {
                        e.preventDefault();
                        window.location.assign(questionLink);
                      }
                    }}
                  >
                    <ArrowUpRight size={20} />
                  </button>
                </form>
                <div className="demo-answer">
                  <img
                    src="/brand/afribit-mark-icon.png"
                    width="29"
                    height="35"
                    alt="Afribit AI"
                  />
                  <p>{sampleAnswer}</p>
                </div>
                <details className="demo-source">
                  <summary>
                    <BookOpen size={14} aria-hidden="true" />
                    {t("demo.source")}
                  </summary>
                  <p>{t("demo.sourceDetail")}</p>
                </details>
              </div>
            </section>
            <p className="hero-tagline wrap">{t("brand.tagline")}</p>
            <section id="how-it-works" className="editorial-section wrap">
              <div className="section-intro">
                <p className="eyebrow">{t("how.eyebrow")}</p>
                <h2>{t("how.title")}</h2>
                <p>{t("how.description")}</p>
              </div>
              <ol className="steps">
                {([1, 2, 3] as const).map((n) => (
                  <li key={n}>
                    <span className="step-index">0{n}</span>
                    <div>
                      <h3>{t(`how.step${n}Title`)}</h3>
                      <p>{t(`how.step${n}Body`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="trust-section">
              <div className="wrap">
                <div className="section-intro">
                  <p className="eyebrow">{t("trust.eyebrow")}</p>
                  <h2>{t("trust.title")}</h2>
                </div>
                <div className="trust-grid">
                  {(
                    [
                      { key: "review", Icon: BookOpen },
                      { key: "secrets", Icon: ShieldCheck },
                      { key: "feedback", Icon: Lock },
                      { key: "open", Icon: Code2 },
                    ] as const
                  ).map(({ key, Icon }) => (
                    <div key={key}>
                      <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                      <h3>{t(`trust.${key}Title`)}</h3>
                      <p>{t(`trust.${key}Body`)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="safety-section wrap">
              <div>
                <p className="eyebrow">{t("safety.eyebrow")}</p>
                <h2>{t("safety.title")}</h2>
              </div>
              <div>
                <p>{t("safety.body")}</p>
                <a
                  className="text-link"
                  href={`/app?question=${encodeURIComponent(t("safety.question"))}`}
                >
                  <ShieldCheck size={19} />
                  {t("safety.action")}
                  <ArrowRight size={17} />
                </a>
              </div>
            </section>
            <section id="community" className="community-section wrap">
              <div className="section-intro">
                <p className="eyebrow">{t("community.eyebrow")}</p>
                <h2>{t("community.title")}</h2>
                <p>{t("community.description")}</p>
              </div>
              <div className="community-options">
                <div>
                  <h3>{t("community.nodeTitle")}</h3>
                  <p>{t("community.nodeBody")}</p>
                  <a className="text-link" href="/community">
                    {t("community.nodeLink")}
                    <ArrowUpRight size={18} />
                  </a>
                </div>
                <div>
                  <h3>{t("community.localTitle")}</h3>
                  <p>{t("community.localBody")}</p>
                  <a
                    className="text-link"
                    href="mailto:eddie@afribit.africa?subject=Afribit%20Local"
                  >
                    {t("community.localLink")}
                    <ArrowUpRight size={18} />
                  </a>
                </div>
                <div>
                  <h3>{t("community.reviewTitle")}</h3>
                  <p>{t("community.reviewBody")}</p>
                  <a className="text-link" href="/app/contribute">
                    {t("community.reviewLink")}
                    <ArrowUpRight size={18} />
                  </a>
                </div>
              </div>
              <div className="community-links">
                <a href={SOURCE_URL}>
                  {t("community.contribute")}
                  <ArrowUpRight size={16} />
                </a>
                <a href="mailto:eddie@afribit.africa?subject=Host%20a%20node">
                  {t("community.host")}
                  <ArrowUpRight size={16} />
                </a>
                <a href="mailto:eddie@afribit.africa?subject=Fund%20Afribit%20AI">
                  {t("community.fund")}
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </section>
            <section id="faq" className="faq-section wrap">
              <div className="section-intro">
                <p className="eyebrow">{t("faq.eyebrow")}</p>
                <h2>{t("faq.title")}</h2>
              </div>
              <div className="faqs">
                {([8, 9, 11, 1, 2, 10, 3, 4, 5, 6, 7] as const).map((n) => (
                  <details key={n}>
                    <summary>
                      {t(`faq.q${n}`)}
                      <Plus size={18} aria-hidden="true" />
                    </summary>
                    <p>{t(`faq.a${n}`)}</p>
                  </details>
                ))}
              </div>
            </section>
            <section className="closing-section">
              <div className="wrap">
                <h2>{t("footer.invite")}</h2>
                <a className="button button-primary" href="/app">
                  {t("landing.cta")}
                  <ArrowUpRight size={20} />
                </a>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="public-footer wrap">
        <div>
          <a href={home} aria-label={t("nav.home")}>
            <BrandMark size="sm" />
          </a>
          <p>{t("footer.licences")}</p>
        </div>
        <nav aria-label={t("nav.footer")}>
          <a href="/privacy">{t("common.privacy")}</a>
          <a href={SOURCE_URL}>{t("common.github")}</a>
          <a href="mailto:eddie@afribit.africa">{t("common.contact")}</a>
        </nav>
      </footer>
    </>
  );
}
