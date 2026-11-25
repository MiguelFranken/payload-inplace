import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createLocalReq, getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { EditorLauncher } from "payload-inplace/launcher";
import { RenderPage } from "../../../../../components/RenderPage";
import {
  translationLocales,
  translationPath,
} from "../../../../../lib/translation-path";

export default async function TranslationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en" && locale !== "de") notFound();

  const payload = await getPayload({ config });
  const {
    docs: [document],
  } = await payload.find({
    collection: "localizedPages",
    where: { slug: { equals: slug } },
    locale,
    fallbackLocale: false,
    draft: false,
    overrideAccess: false,
    limit: 1,
  });
  if (!document) notFound();

  const requestHeaders = await headers();
  const hasAuthCookie = (requestHeaders.get("cookie") || "")
    .split(";")
    .some((cookie) =>
      cookie.trim().startsWith(`${payload.config.cookiePrefix}-token=`),
    );
  const { user } = hasAuthCookie
    ? await payload.auth({ headers: requestHeaders })
    : { user: null };
  const req = user
    ? await createLocalReq(
        {
          user,
          locale,
          fallbackLocale: false,
          req: { headers: new Headers(requestHeaders) },
        },
        payload,
      )
    : null;

  return (
    <>
      <nav
        aria-label={locale === "de" ? "Inhaltssprache" : "Content language"}
        className="demo:flex demo:flex-wrap demo:gap-4 demo:px-6 demo:pt-4 demo:sm:px-12"
      >
        {translationLocales.map((language) => (
          <a
            key={language}
            href={translationPath(language, slug)}
            lang={language}
            hrefLang={language}
            aria-current={language === locale ? "page" : undefined}
            className="demo:inline-flex demo:min-h-11 demo:items-center demo:text-ink demo:underline demo:underline-offset-4"
          >
            {language === "en" ? "English" : "Deutsch"}
          </a>
        ))}
      </nav>
      <div lang={locale}>
        <RenderPage document={{ ...document }} root="layout" />
      </div>
      {req && (
        <EditorLauncher
          req={req}
          target={{
            collection: "localizedPages",
            id: document.id,
            root: "layout",
          }}
          options={editorOptions}
        />
      )}
    </>
  );
}
