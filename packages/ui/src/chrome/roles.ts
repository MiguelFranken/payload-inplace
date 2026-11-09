/** Semantic Tailwind roles shared by editor panels and review surfaces; consumers override --pve-* variables. */
export const chrome = {
  surface:
    "pve:bg-[var(--pve-surface,var(--theme-elevation-0))]! pve:text-[var(--pve-text,var(--theme-text))]!",
  muted: "pve:text-[var(--pve-muted,var(--theme-elevation-700))]",
  border: "pve:border-[var(--pve-border,var(--theme-border-color))]",
  heading:
    "pve:m-0 pve:text-sm pve:font-semibold pve:leading-snug pve:text-balance",
  controls:
    "pve:flex pve:flex-wrap pve:items-center pve:gap-2 pve:[&_.btn]:m-0!",
  select:
    "pve:box-border pve:min-h-10 pve:w-full pve:rounded-md pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color))] pve:bg-[var(--theme-input-bg)] pve:px-3 pve:py-2 pve:text-base pve:text-[var(--pve-text,var(--theme-text))] pve:lg:text-sm",
};
