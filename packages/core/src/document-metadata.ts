const privateFields = new Set([
  "_veActivation",
  "_veReview",
  "_veReviewToken",
  "_veRestoreVersion",
]);
const metadataFields = new Set([
  "id",
  "globalType",
  "createdAt",
  "updatedAt",
  "_status",
  "_veRevision",
  ...privateFields,
]);
/** Private transport fields never belong to consumer presentation or copied version content. */
export function isPrivateEditorField(name: string): boolean {
  return privateFields.has(name);
}
/** Root document metadata is excluded from authored comparisons; nested content IDs remain authored identity. */
export function isDocumentMetadataField(name: string): boolean {
  return metadataFields.has(name);
}
