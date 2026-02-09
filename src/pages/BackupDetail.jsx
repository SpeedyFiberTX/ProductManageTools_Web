import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../lib/api";

const TABS = [
  { id: "overview", label: "基本資訊" },
  { id: "variants", label: "變體" },
  { id: "metafields", label: "Metafields" },
];

export default function BackupDetail() {
  const { getJson } = useApi();
  const navigate = useNavigate();
  const { id: rawId } = useParams();
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("current");
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [showRawTranslationHtml, setShowRawTranslationHtml] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [showRawMetafieldRichText, setShowRawMetafieldRichText] = useState(false);

  const productId = useMemo(() => {
    if (!rawId) return "";
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  }, [rawId]);

  useEffect(() => {
    if (!productId) return;
    setDetailLoading(true);
    setDetailError("");
    getJson(`/api/products/${encodeURIComponent(productId)}?full=1`)
      .then((res) => {
        setDetail(res.item || null);
      })
      .catch((err) => {
        console.error(err);
        setDetailError(err.message || "載入完整資料失敗");
      })
      .finally(() => setDetailLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    setVersionsLoading(true);
    setVersionsError("");
    getJson(`/api/products/${encodeURIComponent(productId)}/versions`)
      .then((res) => setVersions(res.items || []))
      .catch((err) => {
        console.error(err);
        setVersionsError(err.message || "載入版本歷史失敗");
      })
      .finally(() => setVersionsLoading(false));
  }, [productId]);

  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const selectedVersion = versions.find((v) => String(v.version_id) === String(selectedVersionId));
  const currentData = detail?.data || {};
  const data = selectedVersion?.data || currentData || {};
  const images = Array.isArray(data.images) ? data.images : [];
  const variants = Array.isArray(data.variants) ? data.variants : [];
  const metafieldsRaw = Array.isArray(data.metafields) ? data.metafields : [];
  const HIDDEN_NAMESPACES = new Set(["global", "judgeme", "reviews"]);
  const metafields = metafieldsRaw.filter((m) => !HIDDEN_NAMESPACES.has(String(m?.namespace || "").trim()));
  const description = stripHtml(data.descriptionHtml);
  const productTranslations = data.translations || {};
  const currentTranslations = currentData.translations || {};

  const isDifferent = (a, b) => {
    try {
      return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
    } catch {
      return a !== b;
    }
  };

  const sectionChanged = {
    overview:
      isDifferent(data.title, currentData.title) ||
      isDifferent(data.handle, currentData.handle) ||
      isDifferent(data.productType, currentData.productType) ||
      isDifferent(data.status, currentData.status) ||
      isDifferent(data.vendor, currentData.vendor) ||
      isDifferent(data.updatedAt, currentData.updatedAt),
    description:
      isDifferent(data.descriptionHtml, currentData.descriptionHtml) ||
      isDifferent(data.seo, currentData.seo),
    images: isDifferent(
      (data.images || []).map((i) => i.url || i.id),
      (currentData.images || []).map((i) => i.url || i.id)
    ),
  };

  const currentVariantsById = new Map(
    (Array.isArray(currentData.variants) ? currentData.variants : []).map((v) => [v.id, v])
  );
  const currentMetafieldsById = new Map(
    (Array.isArray(currentData.metafields) ? currentData.metafields : []).map((m) => [m.id, m])
  );

  const isVariantChanged = (v) => {
    const cur = currentVariantsById.get(v.id);
    if (!cur) return true;
    return (
      isDifferent(v.title, cur.title) ||
      isDifferent(v.sku, cur.sku) ||
      isDifferent(v.price, cur.price) ||
      isDifferent(v.compareAtPrice, cur.compareAtPrice) ||
      isDifferent(v.selectedOptions, cur.selectedOptions) ||
      isDifferent(v.inventoryItem, cur.inventoryItem)
    );
  };

  const isMetafieldChanged = (m) => {
    const cur = currentMetafieldsById.get(m.id);
    if (!cur) return true;
    return (
      isDifferent(m.namespace, cur.namespace) ||
      isDifferent(m.key, cur.key) ||
      isDifferent(m.value, cur.value) ||
      isDifferent(m.translations, cur.translations)
    );
  };

  const getTranslationsForKeys = (keys = []) => {
    const results = [];
    for (const [locale, arr] of Object.entries(productTranslations)) {
      if (!Array.isArray(arr)) continue;
      const values = arr
        .filter((t) => keys.includes(t.key))
        .map((t) => t.value)
        .filter(Boolean);
      if (values.length) results.push({ locale, value: values.join(" / ") });
    }
    return results;
  };

  const renderTranslationInline = (items) => {
    if (!items.length) return null;
    return (
      <div className="mt-2 space-y-1">
        {items.map((t) => (
          <div key={t.locale} className="text-xs text-slate-500">
            <span className="font-medium text-slate-600">{t.locale}:</span> {t.value}
          </div>
        ))}
      </div>
    );
  };

  const renderRichTextNode = (node, key) => {
    if (!node) return null;
    if (node.type === "text") {
      return <span key={key}>{node.value || ""}</span>;
    }
    if (node.type === "list") {
      const Tag = node.listType === "ordered" ? "ol" : "ul";
      return (
        <Tag key={key} className="list-disc pl-5">
          {(node.children || []).map((child, idx) =>
            renderRichTextNode(child, `${key}-li-${idx}`)
          )}
        </Tag>
      );
    }
    if (node.type === "list-item") {
      return <li key={key}>{(node.children || []).map((c, i) => renderRichTextNode(c, `${key}-c-${i}`))}</li>;
    }
    if (node.children && Array.isArray(node.children)) {
      return (
        <div key={key} className="space-y-1">
          {node.children.map((child, idx) => renderRichTextNode(child, `${key}-${idx}`))}
        </div>
      );
    }
    return null;
  };

  const renderRichText = (value) => {
    try {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      if (!obj || obj.type !== "root" || !Array.isArray(obj.children)) return null;
      return (
        <div className="space-y-2">
          {obj.children.map((child, idx) => renderRichTextNode(child, `rt-${idx}`))}
        </div>
      );
    } catch {
      return null;
    }
  };

  const renderMetafieldTranslationValue = (t, metafieldType) => {
    const rich =
      (metafieldType && String(metafieldType).includes("rich_text")) || renderRichText(t.value);
    if (rich) {
      if (showRawMetafieldRichText) {
        return (
          <pre className="whitespace-pre-wrap break-all text-xs bg-white/60 border border-slate-200 rounded-lg p-2 mt-1">
            {t.value}
          </pre>
        );
      }
      return <div className="text-sm text-slate-700 mt-1">{renderRichText(t.value)}</div>;
    }
    return <span>{t.value}</span>;
  };

  const renderHtmlTranslations = (items) => {
    if (!items.length) return null;
    return (
      <div className="mt-3 space-y-2">
        {items.map((t) => (
          <div key={t.locale} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
              {t.locale}
            </div>
            {showRawTranslationHtml ? (
              <pre className="whitespace-pre-wrap break-all text-xs bg-white/60 border border-slate-200 rounded-lg p-3">
                {t.value}
              </pre>
            ) : (() => {
              const rich = renderRichText(t.value);
              if (rich) return <div className="text-sm text-slate-700">{rich}</div>;
              return (
                <div
                  className="max-w-none whitespace-normal [&_p]:my-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:my-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 text-sm text-slate-700"
                  dangerouslySetInnerHTML={{ __html: t.value }}
                />
              );
            })()}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">產品備份</h1>
          <div className="text-sm text-slate-500 mt-1">ID: {productId || "—"}</div>
        </div>
        <button
          onClick={() => navigate("/backup_v2")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          返回列表
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm border ${
              tab === t.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {detailLoading && (
        <div className="text-sm text-slate-500">載入完整資料中...</div>
      )}
      {!detailLoading && detailError && (
        <div className="text-sm text-red-600">{detailError}</div>
      )}

      {!detailLoading && detail && (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 h-fit">
            <div className="text-xs text-slate-500 mb-3">版本歷史</div>
            {versionsLoading && (
              <div className="text-sm text-slate-500">載入版本歷史中...</div>
            )}
            {!versionsLoading && versionsError && (
              <div className="text-sm text-red-600">{versionsError}</div>
            )}
            {!versionsLoading && !versionsError && (
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedVersionId("current")}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs ${
                    selectedVersionId === "current"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium text-slate-800">Current</div>
                  <div className="text-[10px] text-slate-500">最新資料（products）</div>
                </button>

                {versions.length === 0 && (
                  <div className="text-xs text-slate-400">—</div>
                )}

                {versions.map((v) => (
                  <button
                    key={v.version_id}
                    onClick={() => setSelectedVersionId(String(v.version_id))}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-xs ${
                      String(selectedVersionId) === String(v.version_id)
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-medium text-slate-800">#{v.version_id}</div>
                    <div className="text-[10px] text-slate-500">
                      {v.updated_at_source ? new Date(v.updated_at_source).toLocaleString() : "—"}
                    </div>
                    <div className="text-[10px] text-slate-400">{v.change_type || "—"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {tab === "overview" && (
            <div className="grid gap-4">
              <div
                className={`rounded-xl border bg-white p-4 ${
                  sectionChanged.overview
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200"
                }`}
              >
                <div className="text-xs text-slate-500 mb-3">基本資訊</div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 pr-3 text-xs font-semibold text-slate-500 w-24">Title</td>
                      <td className="py-2 text-slate-800 font-semibold">{data.title || "—"}</td>
                    </tr>
                    {getTranslationsForKeys(["title"]).map((t) => (
                      <tr key={`title-${t.locale}`}>
                        <td className="py-2 pr-3 text-xs text-slate-500">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {t.locale}
                          </span>
                        </td>
                        <td className="py-2 text-slate-600">{t.value}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-2 pr-3 text-xs font-semibold text-slate-500">Handle</td>
                      <td className="py-2 text-slate-700">{data.handle || "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-xs font-semibold text-slate-500">Type</td>
                      <td className="py-2 text-slate-700">{data.productType || "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-xs font-semibold text-slate-500">Status</td>
                      <td className="py-2">
                        {data.status ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              String(data.status).toLowerCase() === "active"
                                ? "bg-green-100 text-green-700"
                                : String(data.status).toLowerCase() === "draft"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {data.status}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-xs font-semibold text-slate-500">Vendor</td>
                      <td className="py-2 text-slate-700">{data.vendor || "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-xs font-semibold text-slate-500">Updated</td>
                      <td className="py-2 text-slate-700">
                        {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                className={`rounded-xl border bg-white p-4 ${
                  sectionChanged.description
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">描述</div>
                  <button
                    onClick={() => setShowRawHtml((v) => !v)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {showRawHtml ? "顯示渲染結果" : "顯示原始 HTML"}
                  </button>
                </div>
                <div className="mt-2">
                  {data.descriptionHtml ? (
                    showRawHtml ? (
                      <pre className="whitespace-pre-wrap break-all text-xs bg-white/60 border border-slate-200 rounded-lg p-3">
                        {data.descriptionHtml}
                      </pre>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 leading-relaxed">
                        <div
                          className="max-w-none whitespace-normal [&_p]:my-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:my-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1"
                          dangerouslySetInnerHTML={{ __html: data.descriptionHtml }}
                        />
                      </div>
                    )
                  ) : (
                    "—"
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">描述翻譯</div>
                  <button
                    onClick={() => setShowRawTranslationHtml((v) => !v)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {showRawTranslationHtml ? "顯示翻譯渲染結果" : "顯示翻譯原始 HTML"}
                  </button>
                </div>
                {renderHtmlTranslations(getTranslationsForKeys(["body_html", "description", "body"]))}
              </div>

              <div
                className={`rounded-xl border bg-white p-4 ${
                  sectionChanged.description
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200"
                }`}
              >
                <div className="text-xs text-slate-500 mb-2">SEO</div>
                <div className="text-sm text-slate-700">
                  <div className="font-medium text-slate-800">{data.seo?.title || "—"}</div>
                  {renderTranslationInline(getTranslationsForKeys(["seo.title"]))}
                  <div className="text-slate-600 mt-1">{data.seo?.description || "—"}</div>
                  {renderTranslationInline(getTranslationsForKeys(["seo.description"]))}
                </div>
              </div>

              <div
                className={`rounded-xl border bg-white p-4 ${
                  sectionChanged.images ? "border-amber-200 bg-amber-50" : "border-slate-200"
                }`}
              >
                <div className="text-xs text-slate-500 mb-3">圖片</div>
                {images.length === 0 && <div className="text-sm text-slate-500">—</div>}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {images.map((img, idx) => (
                      <button
                        key={img.id || img.url}
                        type="button"
                        onClick={() => {
                          setImageIndex(idx);
                          setImagePreview(img);
                        }}
                        className="w-20 focus:outline-none"
                        title="點擊放大"
                      >
                        <img
                          src={img.url}
                          alt={img.altText || data.title || "product image"}
                          className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "variants" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-500">變體</div>
                <div className="text-xs text-slate-500">共 {variants.length} 筆</div>
              </div>
              {variants.length === 0 && <div className="text-sm text-slate-500">—</div>}
              {variants.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="text-left py-2 pr-4">Title</th>
                        <th className="text-left py-2 pr-4">SKU</th>
                        <th className="text-left py-2 pr-4">Price</th>
                        <th className="text-left py-2 pr-4">Options</th>
                        <th className="text-left py-2 pr-4">Inventory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => {
                        const changed = isVariantChanged(v);
                        return (
                          <tr
                            key={v.id}
                            className={`border-t ${
                              changed ? "border-amber-100 bg-amber-50" : "border-slate-100"
                            }`}
                          >
                        <td className="py-2 pr-4 text-slate-700">{v.title || "—"}</td>
                        <td className="py-2 pr-4 text-slate-600">{v.sku || "—"}</td>
                        <td className="py-2 pr-4 text-slate-600">{v.price || "—"}</td>
                          <td className="py-2 pr-4 text-slate-600">
                            {Array.isArray(v.selectedOptions)
                              ? v.selectedOptions.map((o) => `${o.name}:${o.value}`).join(", ")
                              : "—"}
                          </td>
                          <td className="py-2 pr-4 text-slate-600">
                            {v.inventoryItem?.id ? (
                              <div>
                                <div className="text-slate-700">{v.inventoryItem.id}</div>
                                <div className="text-slate-500">tracked: {String(v.inventoryItem.tracked)}</div>
                              </div>
                            ) : "—"}
                        </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "metafields" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-500">Metafields</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowRawMetafieldRichText((v) => !v)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {showRawMetafieldRichText ? "顯示 Rich Text 渲染結果" : "顯示 Rich Text 原始 JSON"}
                  </button>
                  <div className="text-xs text-slate-500">共 {metafields.length} 筆</div>
                </div>
              </div>
              {metafields.length === 0 && <div className="text-sm text-slate-500">—</div>}
              {metafields.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs table-fixed">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="text-left py-2 pr-2 w-[140px]">Namespace</th>
                        <th className="text-left py-2 pr-2 w-[180px]">Key</th>
                        <th className="text-left py-2 pr-2">Value</th>
                        <th className="text-left py-2 pr-2 w-[220px]">Translations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metafields.map((m) => {
                        const changed = isMetafieldChanged(m);
                        const rawValue =
                          typeof m.value === "string" ? m.value : JSON.stringify(m.value);
                        let valueText = rawValue;
                        if (typeof valueText === "string") {
                          try {
                            const parsed = JSON.parse(valueText);
                            if (Array.isArray(parsed)) {
                              valueText = parsed.join(", ");
                            }
                          } catch {
                            // keep original
                          }
                        }
                        const richTextRendered =
                          (m.type && String(m.type).includes("rich_text")) || (typeof rawValue === "string" && rawValue.trim().startsWith("{"));
                        const richTextView = richTextRendered ? renderRichText(rawValue) : null;
                        return (
                          <tr
                            key={m.id}
                            className={`border-t ${
                              changed ? "border-amber-100 bg-amber-50" : "border-slate-100"
                            }`}
                          >
                          <td className="py-2 pr-2 text-slate-700 truncate">{m.namespace || "—"}</td>
                          <td className="py-2 pr-2 text-slate-600 truncate">{m.key || "—"}</td>
                          <td className="py-2 pr-2 text-slate-600">
                            {richTextView ? (
                              showRawMetafieldRichText ? (
                                <pre className="whitespace-pre-wrap break-all text-xs bg-white/60 border border-slate-200 rounded-lg p-3">
                                  {rawValue}
                                </pre>
                              ) : (
                                <div className="text-sm text-slate-700">{richTextView}</div>
                              )
                            ) : (
                              <div className="whitespace-pre-wrap break-all">{valueText}</div>
                            )}
                          </td>
                          <td className="py-2 pr-2 text-slate-600">
                            {m.translations && Object.keys(m.translations).length > 0 ? (
                              <div className="space-y-2">
                                {Object.entries(m.translations).map(([locale, arr]) => (
                                  <div key={locale} className="text-xs text-slate-500">
                                    <div className="font-medium text-slate-600">{locale}:</div>
                                    {Array.isArray(arr) && arr.length ? (
                                      <div className="mt-1 space-y-2">
                                        {arr.map((t, idx) => (
                                          <div key={`${locale}-${idx}`}>
                                            {renderMetafieldTranslationValue(t, m.type)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    {imagePreview && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setImagePreview(null)}
        />
        <div className="relative z-10 max-w-[92vw] max-h-[90vh]">
          <img
            src={images[imageIndex]?.url || imagePreview.url}
            alt={images[imageIndex]?.altText || imagePreview.altText || "preview"}
            className="max-w-[92vw] max-h-[90vh] rounded-xl shadow-2xl border border-white/10"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setImageIndex((i) => (i - 1 + images.length) % images.length)
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white/95 text-slate-700 border border-slate-200 rounded-full w-9 h-9 flex items-center justify-center shadow hover:bg-white"
                title="上一張"
              >
                <span aria-hidden>‹</span>
              </button>
              <button
                type="button"
                onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white/95 text-slate-700 border border-slate-200 rounded-full w-9 h-9 flex items-center justify-center shadow hover:bg-white"
                title="下一張"
              >
                <span aria-hidden>›</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="absolute -top-3 -right-3 bg-white text-slate-700 border border-slate-200 rounded-full px-2 py-1 text-xs shadow"
          >
            關閉
          </button>
        </div>
      </div>
    )}
    </>
  );
}
