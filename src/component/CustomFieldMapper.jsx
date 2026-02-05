import { useEffect, useMemo, useState } from "react";
import SmartComboBox from "./SmartComboBox";

/** 內建模板（可依你的 CSV 標頭調整 regex 或直接 header 指定） */
const BUILTIN_TEMPLATES = [
  { id: "empty", name: "（空白）", entries: [] },
  {
    id: "Transceiver",
    name: "Transceiver",
    entries: [
      { slot: "custom_1", header: "Vendor" },
      { slot: "custom_2", header: "Form Factor" },
      { slot: "custom_3", header: "Connector" },
      { slot: "custom_4", header: "Rx LOS" },
      { slot: "custom_5", header: "Cable Type" },
      { slot: "custom_6", header: "Dimension (HxWxD)" },
      { slot: "custom_7", header: "Cable Jacket" },
      { slot: "custom_8", header: "Max. Data Rate" },
      { slot: "custom_9", header: "Wavelength" },
      { slot: "custom_10", header: "Max. Cable Distance" },
      { slot: "custom_11", header: "Media" },
      { slot: "custom_12", header: "Optical Components" },
      { slot: "custom_13", header: "Transmitter Type" },
      { slot: "custom_14", header: "Receiver Type" },
      { slot: "custom_15", header: "Modulation" },
      { slot: "custom_16", header: "Extinction Ratio" },
      { slot: "custom_17", header: "Core Size" },
      { slot: "custom_18", header: "CDR (Clock and Data Recovery)" },
      { slot: "custom_19", header: "Modulation (Electrical)" },
      { slot: "custom_20", header: "Modulation (Optical)" },
      { slot: "custom_21", header: "Packaging Technology" },
      { slot: "custom_22", header: "DSP" },
      { slot: "custom_23", header: "Power Consumption" },
      { slot: "custom_24", header: "TX Power" },
      { slot: "custom_25", header: "Power Budget" },
      { slot: "custom_26", header: "DOM/DDM Support" },
      { slot: "custom_27", header: "MTBF (SX)" },
      { slot: "custom_28", header: "Inbuilt FEC" },
      { slot: "custom_29", header: "Receiver Sensitivity" },
      { slot: "custom_30", header: "Receiver Overload" },
      { slot: "custom_31", header: "Bit Error Ratio (BER)" },
      { slot: "custom_32", header: "Minimum Receiver Power" },
      { slot: "custom_33", header: "Commercial Temperature Range" },
      { slot: "custom_34", header: "Operating Temperature Range" },
      { slot: "custom_35", header: "Industrial Temperature Range" },
      { slot: "custom_36", header: "Storage Temperature" },
      { slot: "custom_37", header: "Protocols" },
      { slot: "custom_38", header: "EMC" },
      { slot: "custom_39", header: "Application Field" },
      { slot: "custom_40", header: "Warranty" },
      { slot: "custom_41", header: "Environmental Compliance" },
      // 一律從最下方加新的，不然會跟其他產品位置不一樣
      // 再到模板處去決定位置就好
    ],
  },
  {
    id: "mtpmpo",
    name: "MTP/MPO",
    entries: [
      { slot: "custom_1", header: "$Connector A" },
      { slot: "custom_2", header: "$Connector B" },
      { slot: "custom_3", header: "$Fiber Count" },
      { slot: "custom_4", header: "$Fiber Mode" },
      { slot: "custom_5", header: "$Wavelength" },
      { slot: "custom_6", header: "$Polarity" },
      { slot: "custom_7", header: "$Insertion Loss" },
      { slot: "custom_8", header: "$Return Loss" },
      { slot: "custom_9", header: "$ConnectorA IL" },
      { slot: "custom_10", header: "$ConnectorA RL" },
      { slot: "custom_11", header: "$ConnectorB IL" },
      { slot: "custom_12", header: "$ConnectorB RL" },
      { slot: "custom_13", header: "$Attenuation at 850nm" },
      { slot: "custom_14", header: "$Attenuation at 1300nm" },
      { slot: "custom_15", header: "$Attenuation at 1310nm" },
      { slot: "custom_16", header: "$Attenuation at 1550nm" },
      { slot: "custom_17", header: "$Cable Outside Diameter (OD)" },
      { slot: "custom_18", header: "$BO Connector Color" },
      { slot: "custom_19", header: "$Breakout Outside Diameter (OD)" },
      { slot: "custom_20", header: "$Operating Temperature" },
      { slot: "custom_21", header: "$Storage Temperature" },
    ],
  },
  {
    id: "uniboot",
    name: "Uniboot",
    entries: [
      { slot: "custom_1", header: "Fiber Mode" },
      { slot: "custom_2", header: "Insertion Loss" },
      { slot: "custom_3", header: "Connector A" },
      { slot: "custom_4", header: "Connector B" },
      { slot: "custom_5", header: "Connector Color" },
      { slot: "custom_6", header: "Fiber Polarity" },
      { slot: "custom_7", header: "Jacket Color" },
      { slot: "custom_8", header: "Cable Dia" }
    ],
  }, {
    id: "vsff",
    name: "VSFF",
    entries: [
      { slot: "custom_1", header: "Connector A" },
      { slot: "custom_2", header: "Connector B" },
      { slot: "custom_3", header: "Fiber Mode" },
      { slot: "custom_4", header: "Wavelength" },
      { slot: "custom_5", header: "Polish Type" },
      { slot: "custom_6", header: "Polarity" },
      { slot: "custom_7", header: "Attenuation at 1310nm" },
      { slot: "custom_8", header: "Attenuation at 1550nm" },
      { slot: "custom_9", header: "Insertion Loss" },
      { slot: "custom_10", header: "Return Loss" },
      { slot: "custom_11", header: "Fiber Count" },
      { slot: "custom_12", header: "Cable Outside Diameter (OD)" },
      { slot: "custom_13", header: "Storage Temperature" },
      { slot: "custom_14", header: "Operating Temperature" },
    ],
  }, {
    id: "loopback",
    name: "Loopback",
    entries: [
      { slot: "custom_1", header: "Fiber connector" },
      { slot: "custom_2", header: "#Fiber Mode" },
      { slot: "custom_3", header: "Insert-pull test" },
      { slot: "custom_4", header: "Insertion loss" },
      { slot: "custom_5", header: "Jacket material" },
      { slot: "custom_6", header: "Operation temperature" },
      { slot: "custom_7", header: "Return loss" },
      { slot: "custom_8", header: "Size" },
      { slot: "custom_9", header: "Housing Type" }
    ],
  }
];

const LS_KEY = "customMapTemplates_v1";

/** localStorage helpers */
const loadUserTemplates = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const saveUserTemplates = (t) => localStorage.setItem(LS_KEY, JSON.stringify(t));

/** template utils */
function resolveTemplateToMap(template, headers) {
  const set = new Set(headers);
  const out = {};
  for (const e of template.entries || []) {
    const { slot, header, match } = e || {};
    if (!slot) continue;
    if (header && set.has(header)) { out[slot] = header; continue; }
    if (match instanceof RegExp) {
      const found = headers.find((h) => match.test(h));
      if (found) out[slot] = found;
    }
  }
  return out;
}
const sanitizeMap = (map, headers) => {
  const set = new Set(headers); const out = {};
  for (const [slot, h] of Object.entries(map || {})) if (h && set.has(h)) out[slot] = h;
  return out;
};
const mergeMaps = (base, add) => ({ ...base, ...add }); // 要完全覆蓋就改成：({ ...add })

export default function CustomFieldMapper({ headers = [], customMap = {}, setCustomMap }) {
  const [userTemplates, setUserTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("empty");

  // 🔹 顯示控制：預設 10 組，按鈕展開更多
  const [visibleCount, setVisibleCount] = useState(10);
  const STEP = 10;
  const MIN_VISIBLE = 10;
  const MAX_SLOTS = 60;

  useEffect(() => setUserTemplates(loadUserTemplates()), []);

  const slots = useMemo(
    () => Array.from({ length: MAX_SLOTS }, (_, i) => `custom_${i + 1}`),
    []
  );
  const visibleSlots = useMemo(
    () => slots.slice(0, Math.min(visibleCount, slots.length)),
    [slots, visibleCount]
  );

  const allTemplates = useMemo(() => [
    ...BUILTIN_TEMPLATES,
    ...userTemplates.map((t) => ({ id: `user:${t.id}`, name: `（自訂）${t.name}`, entries: t.entries || [] })),
  ], [userTemplates]);

  const selectedTemplate = useMemo(
    () => allTemplates.find((t) => t.id === selectedId) || BUILTIN_TEMPLATES[0],
    [allTemplates, selectedId]
  );

  /** actions */
  const applyTemplate = () => {
    const clean = sanitizeMap(resolveTemplateToMap(selectedTemplate, headers), headers);
    setCustomMap((prev) => mergeMaps(prev, clean));
  };

  const saveAsTemplate = () => {
    const name = window.prompt("請輸入這個模板的名稱：");
    if (!name) return;
    const entries = Object.entries(customMap || {})
      .filter(([,h]) => !!h)
      .map(([slot, header]) => ({ slot, header }));
    const newT = { id: `${Date.now()}`, name, entries };
    const next = [...userTemplates, newT];
    setUserTemplates(next);
    saveUserTemplates(next);
    setSelectedId(`user:${newT.id}`);
  };

  const deleteUserTemplate = () => {
    const userId = selectedId.startsWith("user:") ? selectedId.slice(5) : null;
    if (!userId) return window.alert("目前選擇的不是自訂模板。");
    const target = userTemplates.find((t) => t.id === userId);
    if (!target) return;
    if (!window.confirm(`確定刪除自訂模板「${target.name}」？`)) return;
    const next = userTemplates.filter((t) => t.id !== userId);
    setUserTemplates(next);
    saveUserTemplates(next);
    setSelectedId("empty");
  };

  const clearMapping = () => setCustomMap({});

  // 🔹 顯示控制按鈕
  const showMore = () => setVisibleCount((c) => Math.min(c + STEP, slots.length));
  const showAll = () => setVisibleCount(slots.length);
  const collapse = () => setVisibleCount(MIN_VISIBLE);

  return (
    <div className="rounded-2xl border border-gray-300 bg-gray-200 p-6 shadow-sm mb-3">
      {/* 標題＋模板操作列 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">規格表</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-600 flex items-center gap-2">
            <span>模板：</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <optgroup label="內建模板">
                {BUILTIN_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
              {userTemplates.length > 0 && (
                <optgroup label="自訂模板">
                  {userTemplates.map((t) => (
                    <option key={`user:${t.id}`} value={`user:${t.id}`}>（自訂）{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <button type="button" onClick={applyTemplate}
            className="text-xs rounded-lg border px-2 py-1 text-slate-600 hover:bg-slate-50">套用模板</button>
          <button type="button" onClick={saveAsTemplate}
            className="text-xs rounded-lg border px-2 py-1 text-slate-600 hover:bg-slate-50">儲存目前為模板</button>
          <button type="button" onClick={deleteUserTemplate}
            className="text-xs rounded-lg border px-2 py-1 text-rose-600 hover:bg-rose-50">刪除自訂模板</button>
          <button type="button" onClick={clearMapping}
            className="text-xs rounded-lg border px-2 py-1 text-slate-600 hover:bg-slate-50">清空對應</button>
        </div>
      </div>

      {/* 目前顯示數量指示 */}
      <div className="mb-2 text-[11px] text-slate-600">
        顯示 {visibleSlots.length} / {slots.length} 組
      </div>

      {/* 欄位區：預設 10 組，可展開 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleSlots.map((slot) => (
          <label key={slot} className="text-xs">
            <span className="block mb-1 text-slate-600 font-medium">{slot}</span>
            <SmartComboBox
              id={`cmb_${slot}`}
              headers={headers}
              value={customMap[slot] ?? ""}
              onChange={(next) => setCustomMap((m) => ({ ...m, [slot]: next }))}
              placeholder="選擇或輸入欄位名稱…"
            />
          </label>
        ))}
      </div>

      {/* 展開/收合控制 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {visibleCount < slots.length && (
          <>
            <button
              type="button"
              onClick={showMore}
              className="text-xs rounded-lg border px-2 py-1 text-slate-600 hover:bg-slate-50"
            >
              顯示更多（+{STEP}）
            </button>
            <button
              type="button"
              onClick={showAll}
              className="text-xs rounded-lg border px-2 py-1 text-slate-600 hover:bg-slate-50"
            >
              顯示全部
            </button>
          </>
        )}
        {visibleCount > MIN_VISIBLE && (
          <button
            type="button"
            onClick={collapse}
            className="text-xs rounded-lg border px-2 py-1 text-slate-600 hover:bg-slate-50"
          >
            收合到前 {MIN_VISIBLE} 組
          </button>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        單一欄位即可「輸入或選擇」。鍵盤 ↑/↓ 移動、Enter/Tab 選取、Esc 關閉；未輸入時清單顯示全部欄位。
      </p>
    </div>
  );
}
