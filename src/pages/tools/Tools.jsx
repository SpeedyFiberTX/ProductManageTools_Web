import React, { useRef, useState } from "react";
import Papa from "papaparse";

import { LENGTH_TABLE } from "../../data/LENGTH_TABLE";
import { CONNECTOR_PRICES } from "../../data/CONNECTOR_PRICES";
import { CABLE_PRICES } from "../../data/CABLE_PRICES";

// 工費（per connector）
const LABOR_PER_CONNECTOR = {
    TW: 0.74,
    TJ: 0.44,
};
// 台幣匯率
const USD_TO_TWD = 32;
// PChome
const PCHOME_MULTIPLIER = 1.4;


/* ----------------------------------
   檢查接頭是否有合法單價
---------------------------------- */
function isConnectorComboValid(connector, fiberMode, polish, lowloss) {
    if (!connector || !fiberMode || !polish || !lowloss) return true;

    const modeKey = fiberMode === "SM" ? "SM" : "MM";
    const polishKey = polish === "APC" ? "APC" : "PC"; // PC = UPC
    const gradeKey = lowloss === "0.2" ? "0.2" : "0.1-0.15";

    const cfgConnector = CONNECTOR_PRICES[connector];
    if (!cfgConnector) return false;

    const cfgGrade = cfgConnector[gradeKey];
    if (!cfgGrade) return false;

    const cfgMode = cfgGrade[modeKey];
    if (!cfgMode) return false;

    if (cfgMode[polishKey] == null) return false;

    return true;
}

/* ----------------------------------
   檢查線材是否有合法單價
---------------------------------- */
function isCableComboValid(jacket, fiberType, fiberMode) {
    if (!jacket || !fiberType || !fiberMode) return true;

    const jacketCfg = CABLE_PRICES[jacket];
    if (!jacketCfg) return false;

    let typeKey = fiberType;
    if (!["Simplex", "Duplex", "Round"].includes(typeKey)) {
        if (fiberType.includes("Simplex")) typeKey = "Simplex";
        else if (fiberType.includes("Duplex")) typeKey = "Duplex";
        else if (fiberType.includes("Round")) typeKey = "Round";
    }

    const typeCfg = jacketCfg[typeKey];
    if (!typeCfg) return false;

    if (!typeCfg[fiberMode]) return false;

    return true;
}

/* ----------------------------------
   組合不合法 → 回傳提示訊息
---------------------------------- */
function getInvalidMessages(selections) {
    const msgs = [];

    const {
        connectorA,
        connectorB,
        polishA,
        polishB,
        fiberMode,
        fiberType,
        lowloss,
        jacket,
    } = selections;

    if (
        connectorA &&
        !isConnectorComboValid(connectorA, fiberMode, polishA, lowloss)
    ) {
        msgs.push(
            `Connector A (${connectorA} / ${polishA || "-"} / ${lowloss || "-"
            } dB) 無對應單價`
        );
    }

    if (
        connectorB &&
        !isConnectorComboValid(connectorB, fiberMode, polishB, lowloss)
    ) {
        msgs.push(
            `Connector B (${connectorB} / ${polishB || "-"} / ${lowloss || "-"
            } dB) 無對應單價`
        );
    }

    if (
        jacket &&
        fiberType &&
        fiberMode &&
        !isCableComboValid(jacket, fiberType, fiberMode)
    ) {
        msgs.push(
            `線材組合 Jacket: ${jacket} / ${fiberType} / Mode: ${fiberMode} 無對應單價`
        );
    }

    return msgs;
}

/* ----------------------------------
   判斷是不是雙工（決定一端幾顆頭）
---------------------------------- */
function isDuplexPatch(fiberType, connectorA, connectorB) {
    if (fiberType === "Duplex" || fiberType === "Round") return true;
    if (
        (connectorA && connectorA.includes("Uniboot")) ||
        (connectorB && connectorB.includes("Uniboot"))
    ) {
        return true;
    }
    return false;
}

/* ----------------------------------
   取得單顆接頭材料費
---------------------------------- */
function getConnectorUnitPrice(connector, fiberMode, polish, lowloss) {
    if (!connector || !polish) return 0;

    const modeKey = fiberMode === "SM" ? "SM" : "MM";
    const polishKey = polish === "APC" ? "APC" : "PC"; // PC = UPC
    const gradeKey = lowloss === "0.2" || !lowloss ? "0.2" : "0.1-0.15";

    const cfgConnector = CONNECTOR_PRICES[connector];
    if (!cfgConnector) return 0;
    const cfgGrade = cfgConnector[gradeKey];
    if (!cfgGrade) return 0;
    const cfgMode = cfgGrade[modeKey];
    if (!cfgMode) return 0;

    const price = cfgMode[polishKey];
    return price || 0;
}

/* ----------------------------------
   取得每米線材單價
---------------------------------- */
function getCablePricePerMeter(jacket, fiberType, fiberMode) {
    if (!jacket || !fiberType || !fiberMode) return 0;

    const jacketCfg = CABLE_PRICES[jacket];
    if (!jacketCfg) return 0;

    let typeKey = fiberType;
    if (!["Simplex", "Duplex", "Round"].includes(typeKey)) {
        if (fiberType.includes("Simplex")) typeKey = "Simplex";
        else if (fiberType.includes("Duplex")) typeKey = "Duplex";
        else if (fiberType.includes("Round")) typeKey = "Round";
    }
    const typeCfg = jacketCfg[typeKey];
    if (!typeCfg) return 0;

    const modeKey = ["SM", "M1", "M2", "M3", "M4", "M5"].includes(fiberMode)
        ? fiberMode
        : "SM";

    const price = typeCfg[modeKey];
    return price || 0;
}

/* ----------------------------------
   把實際長度換成計價長度（每 0.5 m 往上取整）
---------------------------------- */
function getBillingLength(meters) {
    if (!meters || meters <= 0) return 0;

    const STEP = 0.5;

    // 先把原始長度四捨五入到小數三位，避免 1.209999 這種浮點數誤差
    const normalized = Math.round(meters * 1000) / 1000;

    // 再用 0.5 m 級距往上取整
    return Math.ceil(normalized / STEP) * STEP;
}

/* ----------------------------------
   計算線材費用
---------------------------------- */
function calculateCableCost(meters, selections) {
    const jacket = selections.jacket;
    const fiberType = selections.fiberType;
    const fiberMode = selections.fiberMode || "SM";

    const perMeter = getCablePricePerMeter(jacket, fiberType, fiberMode);
    if (!perMeter) return 0;

    const effectiveLength = getBillingLength(meters);

    return Number((perMeter * effectiveLength).toFixed(4));
}

/* ----------------------------------
   計算接頭＋工費
---------------------------------- */
function isUniboot(connector) {
    return connector?.includes("Uniboot");
}

// 材料用幾顆（Uniboot 兩顆算一顆）
function getMaterialConnectorsPerEnd(fiberType, connector) {
    if (isUniboot(connector)) return 1;                  // ✅ Uniboot：每端 1
    if (fiberType === "Duplex" || fiberType === "Round") return 2;
    return 1; // Simplex
}

// 工費用幾顆（Uniboot 一樣算 2 顆的工）
function getLaborConnectorsPerEnd(fiberType) {
    if (fiberType === "Duplex" || fiberType === "Round") return 2;
    return 1; // Simplex
}

// 計算接頭＋工費
function calculateConnectorAndLabor(selections) {
    const connectorA = selections.connectorA || "";
    const connectorB = selections.connectorB || "";
    const polishA = selections.polishA || "";
    const polishB = selections.polishB || "";
    const fiberMode = selections.fiberMode || "SM";
    const fiberType = selections.fiberType || "Simplex";
    const lowloss = selections.lowloss || "0.2";

    // 新增：出貨地點（預設台灣）
    const shipFrom = selections.shipFrom || "TW";
    const laborUnit = LABOR_PER_CONNECTOR[shipFrom] ?? LABOR_PER_CONNECTOR.TW;

    // 單顆材料單價
    const unitA = getConnectorUnitPrice(connectorA, fiberMode, polishA, lowloss);
    const unitB = getConnectorUnitPrice(connectorB, fiberMode, polishB, lowloss);

    // 🔹材料顆數（Uniboot 每端 1 顆）
    const materialA = getMaterialConnectorsPerEnd(fiberType, connectorA);
    const materialB = getMaterialConnectorsPerEnd(fiberType, connectorB);

    // 🔹工費顆數（Duplex/Round 每端 2 顆，Uniboot 也一樣）
    const laborA = getLaborConnectorsPerEnd(fiberType);
    const laborB = getLaborConnectorsPerEnd(fiberType);

    const connectorCost =
        unitA * materialA +
        unitB * materialB;

    const totalLaborConnectors = laborA + laborB;
    const laborCost = totalLaborConnectors * laborUnit;

    return {
        connectorCost,
        laborCost,
        total: connectorCost + laborCost,
        // 如果之後想 debug/顯示可以用：
        materialConnectors: materialA + materialB,
        laborConnectors: totalLaborConnectors,
        shipFrom,
        laborUnit,
    };
}


/* ----------------------------------
   整條線價格 = 接頭＋工費＋線材
---------------------------------- */
function calculatePrice(meters, selections) {
    const { total: connectorAndLabor } = calculateConnectorAndLabor(selections);
    const cableCost = calculateCableCost(meters, selections);
    return Number((connectorAndLabor + cableCost).toFixed(2));
}

/* ----------------------------------
   Component
---------------------------------- */
export default function Tools() {
    const formRef = useRef(null);
    const [rows, setRows] = useState([]);
    const [currentSelections, setCurrentSelections] = useState(null);
    const [warnings, setWarnings] = useState([]);

    const handleGetValues = () => {
        if (!formRef.current) return;

        const formData = new FormData(formRef.current);
        const selections = Object.fromEntries(formData.entries());
        setCurrentSelections(selections);

        // 🔍 檢查組合是否合法
        const msgs = getInvalidMessages(selections);
        setWarnings(msgs);

        const resultRows = LENGTH_TABLE.map((item) => {
            const cableCost = calculateCableCost(item.meters, selections);
            const totalPrice = calculatePrice(item.meters, selections);

            const totalPriceTWD = totalPrice * USD_TO_TWD;
            const pchomePrice = totalPriceTWD * PCHOME_MULTIPLIER;

            return {
                meters: item.meters,
                label: item.label,
                cableCost,
                totalPrice,
                totalPriceTWD: Math.round(totalPriceTWD),
                pchomePrice: Math.round(pchomePrice),
            };
        });

        setRows(resultRows);
    };

    // 匯出 CSV
    const handleExportCsv = () => {
        if (!rows.length || warnings.length > 0) return;

        const data = rows.map((row) => ({
            connectorA: currentSelections?.connectorA || "",
            polishA: currentSelections?.polishA || "",
            connectorB: currentSelections?.connectorB || "",
            polishB: currentSelections?.polishB || "",
            fiberMode: currentSelections?.fiberMode || "",
            fiberType: currentSelections?.fiberType || "",
            insertionLoss: currentSelections?.lowloss || "",
            jacket: currentSelections?.jacket || "",
            length_m: row.meters,
            length_label: row.label,
            cable_price_usd: row.cableCost.toFixed(3), // 線材價格
            total_price_usd: row.totalPrice.toFixed(2), // 總價
            total_price_twd: Math.round(row.totalPrice * USD_TO_TWD),
            pchomePrice: Math.round(row.pchomePrice),
        }));

        const csv = Papa.unparse(data);

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "price_table.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    };

    // 這裡用目前選擇算出「接頭＋工費」摘要
    const costDetail = currentSelections
        ? calculateConnectorAndLabor(currentSelections)
        : null;

    return (
        <div className="flex min-h-screen bg-slate-100">
            {/* 左側：篩選側邊欄 */}
            <aside className="w-72 bg-white border-r shadow-sm">
                <div className="p-4">
                    <h2 className="mb-4 text-lg font-semibold">工具篩選條件</h2>

                    <form ref={formRef} className="space-y-4">
                        <div className="flex flex-col text-left">
                            <label htmlFor="shipFrom" className="mb-1 text-sm font-medium">
                                Ship From
                            </label>
                            <select
                                name="shipFrom"
                                id="shipFrom"
                                className="bg-white p-2 rounded shadow border"
                                defaultValue="TW"
                            >
                                <option value="TW">Taiwan (Labor $0.74/connector)</option>
                                <option value="TJ">Tianjin (Labor $0.44/connector)</option>
                            </select>
                        </div>
                        {/* Connector A */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="connectorA"
                                className="mb-1 text-sm font-medium"
                            >
                                Connector A
                            </label>
                            <select
                                name="connectorA"
                                id="connectorA"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Connector A</option>
                                <option value="LC">LC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="LC Uniboot">LC Uniboot</option>
                                <option value="LC Uniboot with Push pull Tab">
                                    LC Uniboot Push pull Tab
                                </option>
                            </select>
                        </div>

                        {/* Polish A */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="polishA"
                                className="mb-1 text-sm font-medium"
                            >
                                Polish A
                            </label>
                            <select
                                name="polishA"
                                id="polishA"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Polish A</option>
                                <option value="UPC">UPC</option>
                                <option value="APC">APC</option>
                            </select>
                        </div>

                        {/* Connector B */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="connectorB"
                                className="mb-1 text-sm font-medium"
                            >
                                Connector B
                            </label>
                            <select
                                name="connectorB"
                                id="connectorB"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Connector B</option>
                                <option value="LC">LC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="LC Uniboot">LC Uniboot</option>
                                <option value="LC Uniboot with Push pull Tab">
                                    LC Uniboot Push pull Tab
                                </option>
                            </select>
                        </div>

                        {/* Polish B */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="polishB"
                                className="mb-1 text-sm font-medium"
                            >
                                Polish B
                            </label>
                            <select
                                name="polishB"
                                id="polishB"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Polish B</option>
                                <option value="UPC">UPC</option>
                                <option value="APC">APC</option>
                            </select>
                        </div>

                        {/* Fiber Mode */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="fiberMode"
                                className="mb-1 text-sm font-medium"
                            >
                                Fiber Mode
                            </label>
                            <select
                                name="fiberMode"
                                id="fiberMode"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Fiber Mode</option>
                                <option value="SM">SM</option>
                                <option value="M1">M1</option>
                                <option value="M2">M2</option>
                                <option value="M3">M3</option>
                                <option value="M4">M4</option>
                                <option value="M5">M5</option>
                            </select>
                        </div>

                        {/* Insertion Loss */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="lowloss"
                                className="mb-1 text-sm font-medium"
                            >
                                Insertion Loss
                            </label>
                            <select
                                name="lowloss"
                                id="lowloss"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Insertion Loss</option>
                                <option value="0.2">0.2dB</option>
                                <option value="0.15">0.15dB</option>
                                <option value="0.1">0.1dB</option>
                            </select>
                        </div>

                        {/* Fiber Type */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="fiberType"
                                className="mb-1 text-sm font-medium"
                            >
                                Fiber Type
                            </label>
                            <select
                                name="fiberType"
                                id="fiberType"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Fiber Type</option>
                                <option value="Simplex">0.2mm Simplex</option>
                                <option value="Duplex">0.2mm Duplex</option>
                                <option value="Round">
                                    0.2mm Round 2F 60um (for Uniboot patch cord)
                                </option>
                            </select>
                        </div>

                        {/* Jacket */}
                        <div className="flex flex-col text-left">
                            <label
                                htmlFor="jacket"
                                className="mb-1 text-sm font-medium"
                            >
                                Jacket
                            </label>
                            <select
                                name="jacket"
                                id="jacket"
                                className="bg-white p-2 rounded shadow border"
                            >
                                <option value="">請選擇 Jacket</option>
                                <option value="OFNP">OFNP</option>
                                <option value="OFNR">OFNR</option>
                                <option value="LSZH">LSZH</option>
                            </select>
                        </div>
                    </form>

                    <button
                        type="button"
                        onClick={handleGetValues}
                        className="mt-4 w-full rounded-md border border-slate-300 bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                        取得目前所有選項，產生長度價格表
                    </button>
                </div>
            </aside>

            {/* 右側：結果區 */}
            <main className="flex-1 p-6">
                <h1 className="mb-4 text-2xl font-bold">常規跳線成本計算工具</h1>

                {/* ⚠ 不合法組合提示 */}
                {warnings.length > 0 && (
                    <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                        <div className="mb-1 font-semibold">⚠ 組合有誤：</div>
                        <ul className="list-inside list-disc">
                            {warnings.map((msg) => (
                                <li key={msg}>{msg}</li>
                            ))}
                        </ul>
                        <div className="mt-1">
                            請調整接頭拋光方式 / 插入損耗 / Jacket / Fiber Type / Mode 後再匯出。
                        </div>
                    </div>
                )}

                {currentSelections && (
                    <div className="mb-4 space-y-1 text-sm text-slate-600">
                        <div>目前組合：</div>
                        <div>
                            Connector A: {currentSelections.connectorA || "-"} / Polish A:{" "}
                            {currentSelections.polishA || "-"}
                        </div>
                        <div>
                            Connector B: {currentSelections.connectorB || "-"} / Polish B:{" "}
                            {currentSelections.polishB || "-"}
                        </div>
                        <div>
                            Fiber Mode: {currentSelections.fiberMode || "-"} / Fiber Type:{" "}
                            {currentSelections.fiberType || "-"}
                        </div>
                        <div>Insertion Loss: {currentSelections.lowloss || "-"}</div>
                        <div>
                            Jacket: {currentSelections.jacket || "-"}
                            （線材價格已納入每米單價）
                        </div>

                        {/* 接頭＋工費價格摘要 */}
                        {costDetail && (
                            <div className="mt-2 space-y-0.5 text-slate-700">
                                <div>
                                    接頭材料費：{costDetail.connectorCost.toFixed(3)} USD
                                </div>
                                <div>工費：{costDetail.laborCost.toFixed(2)} USD</div>
                                <div className="font-semibold">
                                    接頭＋工費小計：{costDetail.total.toFixed(2)} USD
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {rows.length > 0 ? (
                    <>
                        <div className="mb-2 flex justify-end">
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={!rows.length || warnings.length > 0}
                            >
                                匯出 CSV
                            </button>
                        </div>

                        <div className="mt-2 overflow-x-auto">
                            <table className="min-w-full border bg-white text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="border px-3 py-2 text-left">Length</th>
                                        <th className="border px-3 py-2 text-right">
                                            Cable Price (USD)
                                        </th>
                                        <th className="border px-3 py-2 text-right">
                                            Total Price (USD)
                                        </th>
                                        <th className="border px-3 py-2 text-right">
                                            Total Price (TWD)
                                        </th>
                                        <th className="border px-3 py-2 text-right">PChome 售價</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.label}>
                                            <td className="border px-3 py-1">{row.label}</td>
                                            <td className="border px-3 py-1 text-right">
                                                {row.cableCost.toFixed(3)} USD
                                            </td>
                                            <td className="border px-3 py-1 text-right">
                                                {row.totalPrice.toFixed(2)} USD
                                            </td>
                                            <td className="border px-3 py-1 text-right">
                                                {row.totalPriceTWD.toLocaleString()} TWD
                                            </td>
                                            <td className="border px-3 py-1 text-right">
                                                {row.pchomePrice.toLocaleString()} TWD
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <p className="text-slate-500">
                        請先在左邊選擇條件，然後按「取得目前所有選項」來產生長度價格表。
                    </p>
                )}
            </main>
        </div>
    );
}
