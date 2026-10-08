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
            aria-label={`${t("common.loading")} Afribit AI`}
          >
            <img
              src="/brand/afribit-mark-icon.png"
              width="48"
              height="56"
              alt="Afribit AI"
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
