"use client";

import { useId } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { useEditorMessages } from "../../localization/EditorMessages";

type Choice = "local" | "latest";

/** Displays competing values and emits a choice for the host to apply. */
export function ConflictChoices({
  rows,
  choices,
  onChoice,
}: {
  rows: {
    path: string;
    labels: string[];
    structural: boolean;
    local: string;
    latest: string;
  }[];
  choices: Record<string, Choice>;
  onChoice: (path: string, choice: Choice) => void;
}) {
  const choiceId = useId();
  const { t } = useEditorMessages();
  return (
    <>
      {rows.map((conflict) => (
        <fieldset
          key={conflict.path}
          className="pve:m-0 pve:min-w-0 pve:rounded-lg pve:border pve:border-solid pve:border-[var(--pve-border,#e3e4e8)] pve:p-3"
        >
          <legend className="pve:max-w-full pve:break-words pve:text-sm pve:font-medium">
            {conflict.labels.join(" / ")}
          </legend>
          {conflict.structural && (
            <p className="pve:text-sm">
              {t("thisChoiceReplacesTheWholeListIncludingItsContent")}
            </p>
          )}
          <RadioGroup
            value={choices[conflict.path] || null}
            onValueChange={(choice) => {
              if (choice === "local" || choice === "latest")
                onChoice(conflict.path, choice);
            }}
            aria-label={t("chooseConflictCopy", {
              label: conflict.labels.join(" / "),
            })}
            className="pve:grid pve:gap-2"
          >
            {(["local", "latest"] as const).map((choice) => (
              <label
                key={choice}
                htmlFor={`${choiceId}:${conflict.path}:${choice}`}
                aria-label={
                  choice === "local"
                    ? t("keepYourCopy")
                    : t("useLatestSavedCopy")
                }
                className="pve:flex pve:items-start pve:gap-2 pve:rounded-lg pve:p-2 pve:text-sm"
              >
                <Radio.Root
                  id={`${choiceId}:${conflict.path}:${choice}`}
                  value={choice}
                  aria-label={
                    choice === "local"
                      ? t("keepYourCopy")
                      : t("useLatestSavedCopy")
                  }
                  className="pve:mt-0.5 pve:flex pve:size-4 pve:shrink-0 pve:items-center pve:justify-center pve:rounded-full pve:border pve:border-solid pve:border-[var(--pve-border,#e3e4e8)] pve:bg-transparent pve:data-checked:border-[var(--pve-accent,#3451eb)] pve:focus-visible:outline-2 pve:focus-visible:outline-offset-2 pve:focus-visible:outline-[var(--pve-accent,#3451eb)]"
                >
                  <Radio.Indicator className="pve:size-2 pve:rounded-full pve:bg-[var(--pve-accent,#3451eb)]" />
                </Radio.Root>
                <span className="pve:min-w-0 pve:break-words">
                  <strong>
                    {choice === "local"
                      ? t("keepYourCopy")
                      : t("useLatestSavedCopy")}
                  </strong>
                  <span className="pve:mt-1 pve:block pve:max-h-28 pve:overflow-auto pve:whitespace-pre-wrap pve:opacity-70">
                    {conflict[choice] || t("empty")}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>
      ))}
    </>
  );
}
