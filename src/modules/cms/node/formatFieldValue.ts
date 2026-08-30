// src/modules/cms/node/formatFieldValue.ts
//
// Post-Phase-8 visual-quality dogfooding pass (user's live review of the 6 targetUI screens +
// the newly built listing/detail pages): every NUMBER field rendered its raw JS number with zero
// formatting ("320000" instead of "320.000 ₫") — a product/game/course price sitting unformatted
// among plain-text fields was the single most-cited "trông quá tệ" complaint. TypeORM/GraphQL
// don't know a field is "money" (there's no dedicated CURRENCY field type in this CMS — see
// FieldDefinitionArrayInput.tsx's FIELD_TYPE_OPTIONS, only NUMBER), so this infers currency from
// the field's own admin-authored label — the same "read intent from what the admin already
// typed" approach `RelationFieldInput.tsx`'s label fallback and `entryDisplayName()` already use
// elsewhere in this codebase, rather than requiring a new schema field admins would have to
// remember to set.
//
// Used by both ContentDetailNode.tsx (Chi tiết nội dung) and CardListNode.tsx (Danh sách dạng
// thẻ) so a price looks the same — formatted, not raw — everywhere it appears on the public site.

// Matches the accented "giá" / "tiền" / "đồng" specifically (not bare "gia"/"tien"/"dong" —
// "Thời gian (phút)" contains "gia" as a substring of "gian" and must NOT match).
const CURRENCY_LABEL_HINT = /giá|price|cost|tiền|đồng|vnđ|vnd/i;

/** `Intl.NumberFormat('vi-VN')` groups with '.' and never adds decimals for an integer input —
 * exactly Vietnamese price convention ("320.000", not "320,000.00"). Falls back to the raw
 * String(value) for anything that isn't a finite number (defensive — a NUMBER-type field's stored
 * value should always be numeric, but public rendering must never throw on bad/legacy data). */
export function formatNumberValue(value: unknown): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat('vi-VN').format(n);
}

/** `label` is the admin-authored field label (e.g. "Giá (VNĐ)", "Thời gian (phút)") — matching
 * against it (not the field `key`) means a price field named anything ("gia", "price", "cost")
 * still gets the "₫" suffix as long as its human-readable label says so, and a genuinely
 * non-monetary NUMBER field (a duration, a rating, a stock count) correctly does NOT get one. */
export function formatNumberFieldValue(value: unknown, label: string | undefined): string {
    const formatted = formatNumberValue(value);
    if (isCurrencyLabel(label)) return `${formatted} ₫`;
    return formatted;
}

/** Exported separately (not just inlined into `formatNumberFieldValue`) — `ContentDetailNode.tsx`
 * needs the same "is this a price field?" test on its OWN to decide which NUMBER field earns the
 * prominent price/stat treatment near the top of the page, independent of formatting the value. */
export function isCurrencyLabel(label: string | undefined): boolean {
    return !!label && CURRENCY_LABEL_HINT.test(label);
}

// `CardListNode.tsx` (a Card List's "Phụ đề" slot, the conventional home for a price on every
// listing built this session) has no field-schema fetch at all — it only knows a slot's raw
// field KEY, never its admin-authored label, so `isCurrencyLabel` doesn't apply there. Matches
// against the field KEY instead, anchored so it doesn't false-positive the way an unanchored "gia"
// would on a camelCase key like "thoiGian" (duration) — every price field created in this CMS so
// far is keyed literally "gia" (Sản phẩm/Game/Khóa học/Món ăn all agree), so an exact-match on
// that convention plus "price"/"cost" substrings covers the real cases without over-matching.
const CURRENCY_KEY_HINT = /^gia$|price|cost/i;

export function isCurrencyKey(key: string | undefined): boolean {
    return !!key && CURRENCY_KEY_HINT.test(key);
}
