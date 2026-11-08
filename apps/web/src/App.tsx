import { lazy, Suspense } from "react";
import { PublicSite } from "./components/PublicSite.js";
import { useI18n } from "./lib/i18n.js";
const LearningApp = lazy(() => import("./components/LearningApp.js"));
export function App({ path = window.location.pathname }: { path?: string }) {
  const { t } = useI18n();
  if (path.startsWith("/app"))
    return (
      <Suspense
        fallback={
          <main
            className="boot-state"
            role="status"
            aria-busy="true"
            style={{background:'#fcfaf5',color:'#193f2b'}}
            aria-label={`${t("common.loading")} Afribit AI`}
          >
            <img
              src="/brand/afribit-learning-motion.svg"
              width="180"
              height="130"
              alt="Afribit AI learning space"
            />
            <p>{t("common.loading")}</p>
          </main>
        }
      >
        <LearningApp />
      </Suspense>
    );
  return <PublicSite path={path} />;
}
