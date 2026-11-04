import type { Message } from "../../../core/src/messages.js";
/** Typed source copy. Consumers override messages by key; content and native field labels stay consumer-owned. */
export const englishMessages = {
  sharedSectionStructure:
    "Section changes affect all content languages. Translated fields use {locale}.",
  empty: "Empty",
  noChanges: "No changes",
  thisDraftMatchesTheSelectedComparison:
    "This draft matches the selected comparison.",
  added: "Added",
  removed: "Removed",
  moved: "Moved",
  changed: "Changed",
  showOnPage: "Show on page",
  formattingOrEmbeddedContentChanged: "Formatting or embedded content changed.",
  restoreFailedReloadAndReviewTheLatestDraft:
    "Restore failed. Reload and review the latest draft.",
  restoreVersion: "Restore version",
  restoreCreatesADraftReviewItsChangesBeforePublishing:
    "Restore creates a draft. Review its changes before publishing.",
  currentDraft: "Current draft",
  selectedVersion: "Selected version",
  restoreAsDraft: "Restore as draft",
  versionUnavailable: "Version unavailable.",
  publicationFailedReviewTheCurrentDraftAndRetry:
    "Publication failed. Review the current draft and retry.",
  reviewChanges: "Review changes",
  review: "Review",
  documentChanges: "Document changes",
  onlyChangedFieldsYourSavedDraftStaysPrivateUntil:
    "Only changed fields. Your saved draft stays private until publication.",
  closeReview: "Close review",
  compareDraftWith: "Compare draft with",
  published: "Published",
  sinceOpening: "Since opening",
  changedFields: "Changed fields",
  whenOpened: "When opened",
  savedDraft: "Saved draft",
  publishesTheCompleteReviewedDraftIncludingChangesFromOther:
    "Publishes the complete reviewed draft, including changes from other sessions.",
  keepEditing: "Keep editing",
  publishReviewedDraft: "Publish reviewed draft",
  editOnWebsite: "Edit on website",
  saveTheDraftBeforeOpeningTheWebsite:
    "Save the draft before opening the website.",
  sectionSettings: "Section settings",
  selectASectionOnThePageToSeeIts:
    "Select a section on the page to see its options.",
  loadingTheLatestAuthorizedDraft: "Loading the latest authorized draft…",
  compareBothCopiesSeparateFieldChangesAreCombinedOverlapping:
    "Compare both copies. Separate field changes are combined; overlapping changes need your choice. Nothing is saved until you accept.",
  compareChanges: "Compare changes",
  yourChanges: "Your changes",
  otherSavedChanges: "Other saved changes",
  thisChoiceReplacesTheWholeListIncludingItsContent:
    "This choice replaces the whole list, including its content. Compare both copies before choosing.",
  theseChangesAffectSeparateFieldsAndCanBeCombined:
    "These changes affect separate fields and can be combined safely.",
  theSaveChecksTheLatestRevisionAgainIfSomeone:
    "The save checks the latest revision again. If someone saves meanwhile, your working copy stays available for another comparison.",
  cancel: "Cancel",
  resizePanelHeight: "Resize panel height",
  resizePanelWidth: "Resize panel width",
  resizePanelWidthAndHeight: "Resize panel width and height",
  backToSections: "Back to sections",
  closePanel: "Close panel",
  thisContentBelongsToAnotherDocumentEnableThatDocument:
    "This content belongs to another document. Enable that document scope to edit it.",
  thisSectionIsNotVisibleOnThePage: "This section is not visible on the page.",
  leaveTheEditorChangesThatHaveNotFinishedSaving:
    "Leave the editor? Changes that have not finished saving may be lost.",
  couldNotLeaveEditingPleaseTryAgain:
    "Could not leave editing. Please try again.",
  openTheLatestSavedDraftDownloadYourWorkingCopy:
    "Open the latest saved draft? Download your working copy first: unsaved changes will not carry over.",
  couldNotReopenTheEditorYourWorkingCopyIs:
    "Could not reopen the editor. Your working copy is still here. Sign in in a new tab, then try again. If access was removed, contact your administrator.",
  editingSessionExpiredDownloadYourWorkingCopyBeforeReopening:
    "Editing session expired. Download your working copy before reopening the editor.",
  editingAccessExpiredOrWasRevokedDownloadYourWorking:
    "Editing access expired or was revoked. Download your working copy before signing in again.",
  theSavedDraftChangedDownloadYourWorkingCopyThen:
    "The saved draft changed. Download your working copy, then reload the latest draft to reconcile your changes.",
  content: "Content",
  contentSection: "Content section",
  editText: "Edit text",
  openSettings: "Open settings",
  section: "Section",
  field: "Field",
  notSaved: "Not saved",
  saving: "Saving…",
  unsavedChanges: "Unsaved changes",
  confirmingSave: "Confirming save…",
  draftSaved: "Draft saved",
  websiteEditor: "Website editor",
  resolveDraftConflict: "Resolve draft conflict",
  loadingComparison: "Loading comparison…",
  savedVersions: "Saved versions",
  loadingVersions: "Loading versions…",
  thisChangeIsNotVisibleOnTheCurrentPage:
    "This change is not visible on the current page.",
  fixField: "Fix field",
  retrySaving: "Retry saving",
  editContent: "Edit content",
  showSectionOnPage: "Show section on page",
  thisContentIsNoLongerAvailableAtThisLocation:
    "This content is no longer available at this location. Select it again to continue.",
  editAllSectionFields: "Edit all section fields",
  sectionActions: "Section actions",
  moveSectionUp: "Move section up",
  moveSectionDown: "Move section down",
  duplicateSection: "Duplicate section",
  removeSection: "Remove section",
  sections: "Sections",
  undoSectionChange: "Undo section change",
  undoLastSectionChange: "Undo last section change",
  redoSectionChange: "Redo section change",
  dragToReorderHereOrOnThePage: "Drag to reorder here or on the page.",
  addSection: "Add section",
  dismiss: "Dismiss",
  refreshSavedPreview: "Refresh saved preview",
  anotherEditorIsWorkingOnThisDocumentEditingResumes:
    "Another editor is working on this document. Editing resumes when their lock is released.",
  checkAgain: "Check again",
  edit: "Edit",
  compareAndRecover: "Compare and recover",
  downloadWorkingCopy: "Download working copy",
  reopening: "Reopening…",
  reopenEditor: "Reopen editor",
  signInNewTab: "Sign in (new tab)",
  reloadTheLatestDraftUnsavedChangesWillBeDiscarded:
    "Reload the latest draft? Unsaved changes will be discarded.",
  reloadLatestDraft: "Reload latest draft",
  editingToolbar: "Editing toolbar",
  editPage: "Edit page",
  selectContent: "Select content",
  moreTools: "More tools",
  saveDraftNow: "Save draft now",
  minimizeEditor: "Minimize editor",
  exitEditing: "Exit editing",
  editTextOnThePageOrChooseASection:
    "Edit text on the page, or choose a section from Sections.",
  updatingServerPreview: "Updating server preview…",
  websiteEditing: "Website editing",
  editThisPage: "Edit this page",
  signInToEditContentDirectlyOnTheWebsite:
    "Sign in to edit content directly on the website. Changes stay in a draft until you review and publish them.",
  email: "Email",
  password: "Password",
  theInstantPreviewCouldNotRenderYourWorkingCopy:
    "The instant preview could not render. Your working copy is retained in the editor. Reload after saving to restore the preview.",
  textFormatting: "Text formatting",
  textStyle: "Text style",
  editLink: "Edit link",
  linkAddress: "Link address",
  httpsExampleCom: "https://example.com",
  applyLink: "Apply link",
  removeLink: "Remove link",
  internalLinksAndMoreOptions: "Internal links and more options",
  moreTextOptions: "More text options",
  addItem: "Add item",
  addSectionBefore: "Add section before",
  addSectionAfter: "Add section after",
  searchMedia: "Search media",
  retrySearch: "Retry search",
  loadMore: "Load more",
  uploadMedia: "Upload media",
  uploadProgress: "Upload progress",
  openNativeMediaEditor: "Open native media editor",
  replacesThisFieldSMediaReferenceSharedAssetMetadata:
    "Replaces this field’s media reference. Shared asset metadata stays unchanged.",
  searchSections: "Search sections",
  searchSections2: "Search sections…",
  noMatchingSections: "No matching sections.",
  previewWithoutSavingInsertWithSchemaDefaults:
    "Preview without saving · Insert with schema defaults",
  restoreFailedReviewTheCurrentDraftBeforeTryingAgain:
    "Restore failed. Review the current draft before trying again.",
  savedVersion: "Saved version",
  compareSavedVersionsRestoringCreatesADraftPublicationStays:
    "Compare saved versions. Restoring creates a draft; publication stays a separate reviewed step.",
  compareVersion: "Compare version {version}",
  draft: "Draft",
  noSavedVersions: "No saved versions.",
  newerVersions: "Newer versions",
  page: "Page",
  olderVersions: "Older versions",
  loadingVersion: "Loading version…",
  retry: "Retry",
  saveCurrentChangesBeforeRestoring: "Save current changes before restoring.",
  thisFieldIsAlreadyOpenInAnotherPanel:
    "This field is already open in another panel.",
  goToOpenField: "Go to open field",
  selectASectionOnThePageToEditThese:
    "Select a section on the page to edit these options.",
  theSelectedSectionIsUnavailableChooseItAgain:
    "The selected section is unavailable. Choose it again.",
  theseOptionsAreAvailableFor: "These options are available for",
  sectionsSelectAMatchingSectionOnThePage:
    "sections. Select a matching section on the page.",
  thisFieldIsUnavailableForYourAccount:
    "This field is unavailable for your account.",
  loadingMediaLibrary: "Loading media library…",
  pageTools: "Page tools",
  couldNotOpenTheEditorPleaseTryAgain:
    "Could not open the editor. Please try again.",
  changedFieldCount: {
    one: "{count} changed field",
    other: "{count} changed fields",
  },
  versionPage: "Page {page}",
  closeNamedPanel: "Close {title} panel",
  moveNamedSection: "Move {label} section",
  showNamedSection: "Show {label} on page",
  settingsForNamedSection: "Settings for {label} section",
  optionsForNamedField: "Options for {label}",
  chooseConflictCopy: "Choose copy for {label}",
  positionChange: "Position {from} → {to}",
  fixedFirstSuffix: " · Fixed first",
  keepYourCopy: "Keep your copy",
  useLatestSavedCopy: "Use latest saved copy",
  preparingNativeFields: "Preparing native fields…",
  useCombinedCopyAndSave: "Use combined copy and save",
  working: "Working…",
  openingEditor: "Opening editor…",
  startEditing: "Start editing",
  signInAndStartEditing: "Sign in and start editing",
  signInFailed:
    "Sign-in failed. Check your email and password, then try again.",
  editingUnavailable:
    "Editing is unavailable for this account. Check your document permissions or sign in with another account.",
  latestDraftUnavailable:
    "The current draft is unavailable. Check your editing access.",
  workingCopyChanged:
    "Your working copy changed. Close and reopen the comparison.",
  comparisonUnavailable: "Comparison unavailable",
  nativeFieldsUnavailable:
    "Native fields could not be prepared. Your working copy is unchanged.",
  recoveryUnavailable: "Recovery could not be applied",
  lastSavedCopy: "Last saved copy",
  yourWorkingCopy: "Your working copy",
  latestSavedDraft: "Latest saved draft",
  editingAccessExpiredWithWorkingCopy:
    "Editing access expired or was revoked. Your working copy is retained. Download it before signing in again.",
  savedPreviewUnavailable:
    "Your draft is saved. The server preview could not refresh.",
  savedPreviewBehind:
    "Your draft is saved. The server preview has not reached its saved revision yet.",
  savedFieldsUnavailable:
    "Saved; unable to refresh native field state. Reload the saved draft.",
  nativeRichTextRequired: "This content requires the native editor.",
  invalidLink: "Select text and enter a valid URL.",
  mediaSearchFailed:
    "Media could not be loaded. Try again or use the native editor.",
  mediaUploadFailed:
    "Upload failed. Choose the file again to retry, or use the native editor.",
  searching: "Searching…",
  noMediaFound: "No media found.",
  saveCouldNotFinish:
    "Saving could not finish. Keep your working copy and retry.",
  savedVersionsUnavailable: "Saved versions unavailable",
  versionNoLongerAvailable: "This version is no longer available",
  restoreFailed: "Restore failed",
  draftChangedInAnotherSession:
    "This document changed in another session. Download your working copy, then reload the latest draft to reconcile the changes.",
  fieldsNeedAttention:
    "Some fields need attention. Open a field below to correct it, then retry saving.",
  saveDidNotFinish:
    "Saving did not finish. Your changes are still in this form. Check the connection, then retry.",
  editingAccessExpired:
    "Editing access expired or was revoked. Download your working copy before signing in again.",
  connectionLost:
    "Connection lost. Your changes remain in this form. Check your connection, then retry.",
  sectionStaysFirst: "This section stays first",
  reviewUnavailable: "Review unavailable",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  paragraph: "Paragraph",
  headingTwo: "Heading 2",
  headingThree: "Heading 3",
  bulletList: "Bullet list",
  numberedList: "Numbered list",
  quote: "Quote",
  editMedia: "Edit media",
  removeMedia: "Remove media",
  clearSelection: "Clear selection",
  showOptions: "Show options",
  actionUnavailable: "This action is unavailable.",
  actionFailed: "Action failed. Check your access and retry.",
} as const;
export type EditorMessageKey = keyof typeof englishMessages;
export type EditorStaticMessageKey = {
  [K in EditorMessageKey]: (typeof englishMessages)[K] extends string
    ? (typeof englishMessages)[K] extends `${string}{${string}`
      ? never
      : K
    : never;
}[EditorMessageKey];
export const germanMessages = {
  sharedSectionStructure:
    "Abschnittsänderungen gelten für alle Inhaltssprachen. Übersetzte Felder verwenden {locale}.",
  empty: "Leer",
  noChanges: "Keine Änderungen",
  thisDraftMatchesTheSelectedComparison:
    "Dieser Stand stimmt mit der gewählten Vergleichsversion überein.",
  added: "Hinzugefügt",
  removed: "Entfernt",
  moved: "Verschoben",
  changed: "Geändert",
  showOnPage: "Auf der Seite zeigen",
  formattingOrEmbeddedContentChanged:
    "Formatierung oder eingebettete Inhalte geändert.",
  restoreFailedReloadAndReviewTheLatestDraft:
    "Wiederherstellen fehlgeschlagen. Aktuellen Entwurf neu laden und prüfen.",
  restoreVersion: "Version wiederherstellen",
  restoreCreatesADraftReviewItsChangesBeforePublishing:
    "Die Version wird als Entwurf wiederhergestellt. Danach Änderungen prüfen und veröffentlichen.",
  currentDraft: "Aktueller Entwurf",
  selectedVersion: "Gewählte Version",
  restoreAsDraft: "Als Entwurf wiederherstellen",
  versionUnavailable: "Version nicht verfügbar.",
  publicationFailedReviewTheCurrentDraftAndRetry:
    "Veröffentlichen fehlgeschlagen. Entwurf erneut prüfen und versuchen.",
  reviewChanges: "Änderungen prüfen",
  review: "Prüfen",
  documentChanges: "Änderungen am Dokument",
  onlyChangedFieldsYourSavedDraftStaysPrivateUntil:
    "Nur geänderte Felder. Der gespeicherte Entwurf bleibt bis zur Veröffentlichung privat.",
  closeReview: "Prüfung schließen",
  compareDraftWith: "Vergleichsversion",
  published: "Veröffentlicht",
  sinceOpening: "Seit Öffnen",
  changedFields: "Geänderte Felder",
  whenOpened: "Beim Öffnen",
  savedDraft: "Gespeicherter Entwurf",
  publishesTheCompleteReviewedDraftIncludingChangesFromOther:
    "Veröffentlicht den gesamten geprüften Entwurf, einschließlich Änderungen aus anderen Sitzungen.",
  keepEditing: "Weiter bearbeiten",
  publishReviewedDraft: "Geprüften Entwurf veröffentlichen",
  editOnWebsite: "Auf der Website bearbeiten",
  saveTheDraftBeforeOpeningTheWebsite:
    "Entwurf speichern, bevor du die Website öffnest.",
  sectionSettings: "Abschnittseinstellungen",
  selectASectionOnThePageToSeeIts:
    "Wähle einen Abschnitt auf der Seite, um seine Optionen anzuzeigen.",
  loadingTheLatestAuthorizedDraft: "Aktueller Entwurf wird geladen…",
  compareBothCopiesSeparateFieldChangesAreCombinedOverlapping:
    "Vergleiche beide Entwürfe. Unabhängige Änderungen werden kombiniert; bei Überschneidungen entscheidest du. Erst nach deiner Bestätigung wird gespeichert.",
  compareChanges: "Änderungen vergleichen",
  yourChanges: "Deine Änderungen",
  otherSavedChanges: "Andere gespeicherte Änderungen",
  thisChoiceReplacesTheWholeListIncludingItsContent:
    "Diese Auswahl ersetzt die gesamte Liste samt Inhalt. Vergleiche beide Entwürfe, bevor du entscheidest.",
  theseChangesAffectSeparateFieldsAndCanBeCombined:
    "Diese Änderungen betreffen unterschiedliche Felder und können kombiniert werden.",
  theSaveChecksTheLatestRevisionAgainIfSomeone:
    "Beim Speichern wird die aktuelle Version erneut geprüft. Falls jemand zwischenzeitlich speichert, bleibt deine Arbeitskopie für einen erneuten Vergleich erhalten.",
  cancel: "Abbrechen",
  resizePanelHeight: "Höhe des Bedienfelds ändern",
  resizePanelWidth: "Breite des Bedienfelds ändern",
  resizePanelWidthAndHeight: "Breite und Höhe des Bedienfelds ändern",
  backToSections: "Zurück zu den Abschnitten",
  closePanel: "Fenster schließen",
  thisContentBelongsToAnotherDocumentEnableThatDocument:
    "Dieser Inhalt gehört zu einem anderen Dokument. Diesen Dokumentbereich zuerst für die Bearbeitung freigeben.",
  thisSectionIsNotVisibleOnThePage:
    "Dieser Abschnitt ist auf der Seite nicht sichtbar.",
  leaveTheEditorChangesThatHaveNotFinishedSaving:
    "Editor verlassen? Noch nicht gespeicherte Änderungen können verloren gehen.",
  couldNotLeaveEditingPleaseTryAgain:
    "Editor konnte nicht geschlossen werden. Bitte erneut versuchen.",
  openTheLatestSavedDraftDownloadYourWorkingCopy:
    "Letzten gespeicherten Entwurf öffnen? Zuerst die Arbeitskopie herunterladen: Ungespeicherte Änderungen werden nicht übernommen.",
  couldNotReopenTheEditorYourWorkingCopyIs:
    "Editor konnte nicht erneut geöffnet werden. Deine Arbeitskopie bleibt erhalten. Melde dich in einem neuen Tab an und versuche es erneut. Bei entzogenem Zugriff wende dich an die Administration.",
  editingSessionExpiredDownloadYourWorkingCopyBeforeReopening:
    "Sitzung abgelaufen. Arbeitskopie vor dem erneuten Öffnen herunterladen.",
  editingAccessExpiredOrWasRevokedDownloadYourWorking:
    "Bearbeitungszugriff abgelaufen oder entzogen. Arbeitskopie vor der erneuten Anmeldung herunterladen.",
  theSavedDraftChangedDownloadYourWorkingCopyThen:
    "Der gespeicherte Entwurf wurde geändert. Arbeitskopie herunterladen und aktuellen Entwurf zum Abgleichen laden.",
  content: "Inhalt",
  contentSection: "Inhaltsabschnitt",
  editText: "Text bearbeiten",
  openSettings: "Einstellungen öffnen",
  section: "Abschnitt",
  field: "Feld",
  notSaved: "Nicht gespeichert",
  saving: "Wird gespeichert…",
  unsavedChanges: "Ungespeicherte Änderungen",
  confirmingSave: "Speichern wird bestätigt…",
  draftSaved: "Entwurf gespeichert",
  websiteEditor: "Website-Editor",
  resolveDraftConflict: "Entwürfe abgleichen",
  loadingComparison: "Vergleich wird geladen…",
  savedVersions: "Gespeicherte Versionen",
  loadingVersions: "Versionen werden geladen…",
  thisChangeIsNotVisibleOnTheCurrentPage:
    "Diese Änderung ist auf der aktuellen Seite nicht sichtbar.",
  fixField: "Feld korrigieren",
  retrySaving: "Erneut speichern",
  editContent: "Inhalt bearbeiten",
  showSectionOnPage: "Abschnitt auf der Seite zeigen",
  thisContentIsNoLongerAvailableAtThisLocation:
    "Dieser Inhalt ist hier nicht mehr verfügbar. Wähle ihn erneut aus, um fortzufahren.",
  editAllSectionFields: "Alle Abschnittsfelder bearbeiten",
  sectionActions: "Abschnittsaktionen",
  moveSectionUp: "Abschnitt nach oben verschieben",
  moveSectionDown: "Abschnitt nach unten verschieben",
  duplicateSection: "Abschnitt duplizieren",
  removeSection: "Abschnitt entfernen",
  sections: "Abschnitte",
  undoSectionChange: "Abschnittsänderung rückgängig machen",
  undoLastSectionChange: "Letzte Abschnittsänderung rückgängig machen",
  redoSectionChange: "Abschnittsänderung wiederholen",
  dragToReorderHereOrOnThePage: "Hier oder auf der Seite zum Sortieren ziehen.",
  addSection: "Abschnitt hinzufügen",
  dismiss: "Schließen",
  refreshSavedPreview: "Gespeicherte Vorschau aktualisieren",
  anotherEditorIsWorkingOnThisDocumentEditingResumes:
    "Eine andere Person bearbeitet dieses Dokument. Nach Freigabe wird die Bearbeitung fortgesetzt.",
  checkAgain: "Erneut prüfen",
  edit: "Bearbeiten:",
  compareAndRecover: "Vergleichen und fortsetzen",
  downloadWorkingCopy: "Arbeitskopie herunterladen",
  reopening: "Wird geöffnet…",
  reopenEditor: "Editor erneut öffnen",
  signInNewTab: "Anmelden (neuer Tab)",
  reloadTheLatestDraftUnsavedChangesWillBeDiscarded:
    "Aktuellen Entwurf laden? Ungespeicherte Änderungen werden verworfen.",
  reloadLatestDraft: "Aktuellen Entwurf laden",
  editingToolbar: "Bearbeitungswerkzeuge",
  editPage: "Seite bearbeiten",
  selectContent: "Inhalte auswählen",
  moreTools: "Weitere Werkzeuge",
  saveDraftNow: "Entwurf jetzt speichern",
  minimizeEditor: "Editor minimieren",
  exitEditing: "Bearbeiten beenden",
  editTextOnThePageOrChooseASection:
    "Inhalt auf der Seite zum Bearbeiten wählen. Escape beendet die Auswahl.",
  updatingServerPreview: "Server-Vorschau wird aktualisiert…",
  websiteEditing: "Website bearbeiten",
  editThisPage: "Diese Seite bearbeiten",
  signInToEditContentDirectlyOnTheWebsite:
    "Melde dich an, um Inhalte direkt auf der Website zu bearbeiten. Änderungen bleiben im Entwurf, bis du sie prüfst und veröffentlichst.",
  email: "E-Mail",
  password: "Passwort",
  theInstantPreviewCouldNotRenderYourWorkingCopy:
    "Die Sofortvorschau konnte nicht dargestellt werden. Deine Arbeitskopie bleibt im Editor erhalten. Lade die Seite nach dem Speichern neu, um die Vorschau wiederherzustellen.",
  textFormatting: "Textformatierung",
  textStyle: "Textstil",
  editLink: "Link bearbeiten",
  linkAddress: "Linkadresse",
  httpsExampleCom: "https://beispiel.de",
  applyLink: "Link übernehmen",
  removeLink: "Link entfernen",
  internalLinksAndMoreOptions: "Interne Links und weitere Optionen",
  moreTextOptions: "Weitere Textoptionen",
  addItem: "Eintrag hinzufügen",
  addSectionBefore: "Abschnitt davor hinzufügen",
  addSectionAfter: "Abschnitt danach hinzufügen",
  searchMedia: "Medien suchen",
  retrySearch: "Suche wiederholen",
  loadMore: "Mehr laden",
  uploadMedia: "Medien hochladen",
  uploadProgress: "Upload-Fortschritt",
  openNativeMediaEditor: "Medien im CMS bearbeiten",
  replacesThisFieldSMediaReferenceSharedAssetMetadata:
    "Ersetzt die Medienverknüpfung dieses Feldes. Gemeinsam genutzte Mediendaten bleiben unverändert.",
  searchSections: "Abschnitte suchen",
  searchSections2: "Abschnitte suchen…",
  noMatchingSections: "Keine passenden Abschnitte.",
  previewWithoutSavingInsertWithSchemaDefaults:
    "Vorschau ohne Speichern · Einfügen mit Standardwerten",
  restoreFailedReviewTheCurrentDraftBeforeTryingAgain:
    "Wiederherstellen fehlgeschlagen. Aktuellen Entwurf erneut prüfen.",
  savedVersion: "Gespeicherte Version",
  compareSavedVersionsRestoringCreatesADraftPublicationStays:
    "Gespeicherte Versionen vergleichen. Wiederherstellen erzeugt einen Entwurf; Veröffentlichen bleibt ein eigener Schritt.",
  compareVersion: "Version {version} vergleichen",
  draft: "Entwurf",
  noSavedVersions: "Keine gespeicherten Versionen.",
  newerVersions: "Neuere Versionen",
  page: "Seite",
  olderVersions: "Ältere Versionen",
  loadingVersion: "Version wird geladen…",
  retry: "Erneut versuchen",
  saveCurrentChangesBeforeRestoring:
    "Zuerst die aktuellen Änderungen speichern.",
  thisFieldIsAlreadyOpenInAnotherPanel:
    "Dieses Feld ist bereits in einem anderen Fenster geöffnet.",
  goToOpenField: "Zum geöffneten Feld",
  selectASectionOnThePageToEditThese:
    "Wähle einen Abschnitt auf der Seite, um diese Optionen zu bearbeiten.",
  theSelectedSectionIsUnavailableChooseItAgain:
    "Der gewählte Abschnitt ist nicht verfügbar. Wähle ihn erneut aus.",
  theseOptionsAreAvailableFor: "Diese Optionen gelten für",
  sectionsSelectAMatchingSectionOnThePage:
    "Abschnitte. Wähle einen passenden Abschnitt auf der Seite.",
  thisFieldIsUnavailableForYourAccount:
    "Dieses Feld ist für dein Konto nicht verfügbar.",
  loadingMediaLibrary: "Mediathek wird geladen…",
  pageTools: "Seitenwerkzeuge",
  couldNotOpenTheEditorPleaseTryAgain:
    "Editor konnte nicht geöffnet werden. Bitte erneut versuchen.",
  changedFieldCount: {
    one: "{count} geändertes Feld",
    other: "{count} geänderte Felder",
  },
  versionPage: "Seite {page}",
  closeNamedPanel: "{title} schließen",
  moveNamedSection: "{label} verschieben",
  showNamedSection: "{label} auf der Seite zeigen",
  settingsForNamedSection: "Einstellungen für {label}",
  optionsForNamedField: "Optionen für {label}",
  chooseConflictCopy: "Entwurf für {label} wählen",
  positionChange: "Position {from} → {to}",
  fixedFirstSuffix: " · Fest an erster Stelle",
  keepYourCopy: "Deine Arbeitskopie behalten",
  useLatestSavedCopy: "Aktuellen gespeicherten Entwurf übernehmen",
  preparingNativeFields: "Felder werden vorbereitet…",
  useCombinedCopyAndSave: "Kombinierten Entwurf übernehmen und speichern",
  working: "Wird ausgeführt…",
  openingEditor: "Editor wird geöffnet…",
  startEditing: "Bearbeitung starten",
  signInAndStartEditing: "Anmelden und Bearbeitung starten",
  signInFailed:
    "Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort und versuche es erneut.",
  editingUnavailable:
    "Dieses Konto kann hier nicht bearbeiten. Prüfe die Dokumentberechtigungen oder melde dich mit einem anderen Konto an.",
  latestDraftUnavailable:
    "Der aktuelle Entwurf ist nicht verfügbar. Prüfe deinen Bearbeitungszugriff.",
  workingCopyChanged:
    "Deine Arbeitskopie wurde geändert. Schließe den Vergleich und öffne ihn erneut.",
  comparisonUnavailable: "Vergleich nicht verfügbar",
  nativeFieldsUnavailable:
    "Die Felder konnten nicht vorbereitet werden. Deine Arbeitskopie bleibt unverändert.",
  recoveryUnavailable: "Der Abgleich konnte nicht übernommen werden",
  lastSavedCopy: "Zuletzt gespeicherter Stand",
  yourWorkingCopy: "Deine Arbeitskopie",
  latestSavedDraft: "Aktueller gespeicherter Entwurf",
  editingAccessExpiredWithWorkingCopy:
    "Der Bearbeitungszugriff ist abgelaufen oder wurde entzogen. Deine Arbeitskopie bleibt erhalten. Lade sie vor der erneuten Anmeldung herunter.",
  savedPreviewUnavailable:
    "Dein Entwurf ist gespeichert. Die Servervorschau konnte nicht aktualisiert werden.",
  savedPreviewBehind:
    "Dein Entwurf ist gespeichert. Die Servervorschau zeigt den gespeicherten Stand noch nicht an.",
  savedFieldsUnavailable:
    "Gespeichert, aber die Felder konnten nicht aktualisiert werden. Lade den gespeicherten Entwurf neu.",
  nativeRichTextRequired: "Dieser Inhalt muss im CMS bearbeitet werden.",
  invalidLink: "Wähle Text aus und gib eine gültige URL ein.",
  mediaSearchFailed:
    "Medien konnten nicht geladen werden. Versuche es erneut oder nutze die CMS-Felder.",
  mediaUploadFailed:
    "Upload fehlgeschlagen. Wähle die Datei erneut aus oder nutze die CMS-Felder.",
  searching: "Suche läuft…",
  noMediaFound: "Keine Medien gefunden.",
  saveCouldNotFinish:
    "Speichern konnte nicht abgeschlossen werden. Behalte deine Arbeitskopie und versuche es erneut.",
  savedVersionsUnavailable: "Gespeicherte Versionen sind nicht verfügbar",
  versionNoLongerAvailable: "Diese Version ist nicht mehr verfügbar",
  restoreFailed: "Wiederherstellen fehlgeschlagen",
  draftChangedInAnotherSession:
    "Dieses Dokument wurde in einer anderen Sitzung geändert. Vergleiche die Entwürfe, bevor du fortfährst. Deine Arbeitskopie bleibt erhalten.",
  fieldsNeedAttention:
    "Einige Felder müssen korrigiert werden. Öffne ein Feld unten und speichere danach erneut.",
  saveDidNotFinish:
    "Speichern wurde nicht abgeschlossen. Deine Änderungen bleiben im Formular erhalten. Prüfe die Verbindung und versuche es erneut.",
  editingAccessExpired:
    "Der Bearbeitungszugriff ist abgelaufen oder wurde entzogen. Lade deine Arbeitskopie vor der erneuten Anmeldung herunter.",
  connectionLost:
    "Verbindung verloren. Deine Änderungen bleiben im Formular erhalten. Prüfe die Verbindung und versuche es erneut.",
  sectionStaysFirst: "Dieser Abschnitt bleibt an erster Stelle",
  reviewUnavailable: "Prüfung nicht verfügbar",
  bold: "Fett",
  italic: "Kursiv",
  underline: "Unterstrichen",
  paragraph: "Absatz",
  headingTwo: "Überschrift 2",
  headingThree: "Überschrift 3",
  bulletList: "Aufzählung",
  numberedList: "Nummerierte Liste",
  quote: "Zitat",
  editMedia: "Medium bearbeiten",
  removeMedia: "Medium entfernen",
  clearSelection: "Auswahl löschen",
  showOptions: "Optionen anzeigen",
  actionUnavailable: "Diese Aktion ist nicht verfügbar.",
  actionFailed:
    "Aktion fehlgeschlagen. Prüfe deinen Zugriff und versuche es erneut.",
} satisfies {
  [K in EditorMessageKey]: (typeof englishMessages)[K] extends string
    ? string
    : Message & object;
};
