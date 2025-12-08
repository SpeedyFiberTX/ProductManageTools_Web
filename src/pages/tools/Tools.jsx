import React, { useRef, useState } from "react";

// === 接頭單價設定（Per Connector 報價，使用你整理好的版本）===
const CONNECTOR_PRICES = {
  SC: {
    "0.2": {
      MM: { PC: 0.315, APC: 0.386 },
      SM: { PC: 0.336, APC: 0.386 },
    },
  },
  LC: {
    "0.2": {
      MM: { PC: 0.345, APC: 0.365 },
      SM: { PC: 0.365, APC: 0.365 },
    },
    "0.1-0.15": {
      MM: { PC: 0.445, APC: 0.465 },
      SM: { PC: 0.465, APC: 0.465 },
    },
  },
  "LC Uniboot": {
    "0.2": {
      MM: { PC: 0.696, APC: 0.716 },
      SM: { PC: 0.716, APC: 0.716 },
    },
    "0.1-0.15": {
      MM: { PC: 0.896, APC: 0.916 },
      SM: { PC: 0.916, APC: 0.916 },
    },
  },
  "LC Uniboot with Push pull Tab": {
    "0.2": {
      MM: { PC: 0.896, APC: 0.916 },
      SM: { PC: 0.916, APC: 0.916 },
    },
    "0.1-0.15": {
      MM: { PC: 1.096, APC: 1.116 },
      SM: { PC: 1.116, APC: 1.116 },
    },
  },
  ST: {
    "0.2": {
      MM: { PC: 0.345 },
      SM: { PC: 0.365 },
    },
  },
};

// === 線材每米單價（Cable with Corning fiber，USD / meter） ===
// key: Jacket -> FiberType(Simplex/Duplex/Round) -> FiberMode(SM/M1~M5)
const CABLE_PRICES = {
  // 第一組：OFNR ClearCurve
  OFNR: {
    Simplex: {
      SM: 0.06,
      M1: 0.16,
      M2: 0.09,
      M3: 0.11,
      M4: 0.19,
      M5: 0.56,
    },
    Duplex: {
      SM: 0.12,
      M1: 0.32,
      M2: 0.18,
      M3: 0.22,
      M4: 0.38,
      M5: 1.12,
    },
    Round: {
      SM: 0.08,
      M1: 0.28,
      M2: 0.15,
      M3: 0.17,
      M4: 0.32,
      M5: 1.09,
    },
  },
  // 第二組：OFNP ClearCurve
  OFNP: {
    Simplex: {
      SM: 0.22,
      M1: 0.28,
      M2: 0.25,
      M3: 0.27,
      M4: 0.35,
      M5: 0.68,
    },
    Duplex: {
      SM: 0.44,
      M1: 0.56,
      M2: 0.5,
      M3: 0.54,
      M4: 0.7,
      M5: 1.36,
    },
    Round: {
      SM: 0.21,
      M1: 0.4,
      M2: 0.27,
      M3: 0.29,
      M4: 0.44,
      M5: 1.21,
    },
  },
  // 第三組：LSZH ClearCurve
  LSZH: {
    Simplex: {
      SM: 0.06,
      M1: 0.15,
      M2: 0.1,
      M3: 0.12,
      M4: 0.2,
      M5: 0.52,
    },
    Duplex: {
      SM: 0.12,
      M1: 0.3,
      M2: 0.2,
      M3: 0.24,
      M4: 0.4,
      M5: 1.04,
    },
    Round: {
      SM: 0.09,
      M1: 0.28,
      M2: 0.15,
      M3: 0.17,
      M4: 0.32,
      M5: 1.09,
    },
  },
};

// 台灣廠工費（per connector）
const LABOR_PER_CONNECTOR_TW = 0.74;

// 長度表
const LENGTH_TABLE = [
  { meters: 0.2, label: "0.2 m / 7 in" },
  { meters: 0.3, label: "0.3 m / 1 ft" },
  { meters: 0.5, label: "0.5 m / 1.64 ft" },
  { meters: 0.6, label: "0.6 m / 2 ft" },
  { meters: 0.91, label: "0.91 m / 3 ft" },
  { meters: 1, label: "1 m / 3.28 ft" },
  { meters: 1.21, label: "1.21 m / 4 ft" },
  { meters: 1.5, label: "1.5 m / 4.92 ft" },
  { meters: 1.52, label: "1.52 m / 5 ft" },
  { meters: 1.82, label: "1.82 m / 6 ft" },
  { meters: 2, label: "2 m / 6.56 ft" },
  { meters: 2.12, label: "2.12 m / 7 ft" },
  { meters: 2.43, label: "2.43 m / 8 ft" },
  { meters: 2.5, label: "2.5 m / 8.20 ft" },
  { meters: 2.74, label: "2.74 m / 9 ft" },
  { meters: 3, label: "3 m / 9.84 ft" },
  { meters: 3.05, label: "3.05 m / 10 ft" },
  { meters: 3.5, label: "3.5 m / 11.48 ft" },
  { meters: 3.65, label: "3.65 m / 12 ft" },
  { meters: 4, label: "4 m / 13.12 ft" },
  { meters: 4.26, label: "4.26 m / 14 ft" },
  { meters: 4.57, label: "4.57 m / 15 ft" },
  { meters: 4.87, label: "4.87 m / 16 ft" },
  { meters: 5, label: "5 m / 16.40 ft" },
  { meters: 5.48, label: "5.48 m / 18 ft" },
  { meters: 6, label: "6 m / 19.68 ft" },
  { meters: 6.09, label: "6.09 m / 20 ft" },
  { meters: 7, label: "7 m / 22.96 ft" },
  { meters: 7.62, label: "7.62 m / 25 ft" },
  { meters: 8, label: "8 m / 26.24 ft" },
  { meters: 9, label: "9 m / 29.52 ft" },
  { meters: 9.14, label: "9.14 m / 30 ft" },
  { meters: 10, label: "10 m / 32.80 ft" },
  { meters: 12, label: "12 m / 39.37 ft" },
  { meters: 12.19, label: "12.19 m / 40 ft" },
  { meters: 15, label: "15 m / 49.21 ft" },
  { meters: 15.24, label: "15.24 m / 50 ft" },
  { meters: 17, label: "17 m / 55.77 ft" },
  { meters: 18.28, label: "18.28 m / 60 ft" },
  { meters: 20, label: "20 m / 65.61 ft" },
  { meters: 21.33, label: "21.33 m / 70 ft" },
  { meters: 22, label: "22 m / 72.17 ft" },
  { meters: 22.86, label: "22.86 m / 75 ft" },
  { meters: 24.38, label: "24.38 m / 80 ft" },
  { meters: 25, label: "25 m / 82.02 ft" },
  { meters: 27.43, label: "27.43 m / 90 ft" },
  { meters: 30, label: "30 m / 98.42 ft" },
  { meters: 30.48, label: "30.48 m / 100 ft" },
  { meters: 33.52, label: "33.52 m / 110 ft" },
  { meters: 35, label: "35 m / 114.82 ft" },
  { meters: 36.57, label: "36.57 m / 120 ft" },
  { meters: 38.1, label: "38.1 m / 125 ft" },
  { meters: 39.62, label: "39.62 m / 130 ft" },
  { meters: 40, label: "40 m / 131.23 ft" },
  { meters: 42.67, label: "42.67 m / 140 ft" },
  { meters: 45.72, label: "45.72 m / 150 ft" },
  { meters: 48.76, label: "48.76 m / 160 ft" },
  { meters: 50, label: "50 m / 164.04 ft" },
  { meters: 53.34, label: "53.34 m / 175 ft" },
  { meters: 54.86, label: "54.86 m / 180 ft" },
  { meters: 55, label: "55 m / 180.44 ft" },
  { meters: 60.96, label: "60.96 m / 200 ft" },
  { meters: 65, label: "65 m / 213.25 ft" },
  { meters: 67.05, label: "67.05 m / 220 ft" },
  { meters: 68.58, label: "68.58 m / 225 ft" },
  { meters: 70, label: "70 m / 229.65 ft" },
  { meters: 73.15, label: "73.15 m / 240 ft" },
  { meters: 76.2, label: "76.20 m / 250 ft" },
  { meters: 79.24, label: "79.24 m / 260 ft" },
  { meters: 80, label: "80 m / 262.46 ft" },
  { meters: 83.82, label: "83.82 m / 275 ft" },
  { meters: 85.34, label: "85.34 m / 280 ft" },
  { meters: 90, label: "90 m / 295.27 ft" },
  { meters: 91.44, label: "91.44 m / 300 ft" },
  { meters: 95, label: "95 m / 311.67 ft" },
  { meters: 99.06, label: "99.06 m / 325 ft" },
  { meters: 100, label: "100 m / 328.08 ft" },
  { meters: 106.68, label: "106.68 m / 350 ft" },
  { meters: 114.3, label: "114.3 m / 375 ft" },
  { meters: 121.92, label: "121.92 m / 400 ft" },
  { meters: 125, label: "125 m / 410.10 ft" },
  { meters: 129.54, label: "129.54 m / 425 ft" },
  { meters: 137.16, label: "137.16 m / 450 ft" },
  { meters: 144.78, label: "144.78 m / 475 ft" },
  { meters: 150, label: "150 m / 492.12 ft" },
  { meters: 152.4, label: "152.40 m / 500 ft" },
  { meters: 160.02, label: "160.02 m / 525 ft" },
  { meters: 167.64, label: "167.64 m / 550 ft" },
  { meters: 175, label: "175 m / 574.14 ft" },
  { meters: 182.88, label: "182.88 m / 600 ft" },
  { meters: 200, label: "200 m / 656.16 ft" },
  { meters: 250, label: "250 m / 820.20 ft" },
  { meters: 300, label: "300 m / 984.25 ft" },
  { meters: 304.8, label: "304.8 m / 1000 ft" },
  { meters: 350, label: "350 m / 1148.29 ft" },
  { meters: 400, label: "400 m / 1312.33 ft" },
  { meters: 500, label: "500 m / 1640.41 ft" },
  { meters: 550, label: "550 m / 1804.46 ft" },
  { meters: 1000, label: "1000 m / 3280.83 ft" },
  { meters: 2000, label: "2000 m / 6561.66 ft" },
];

// 判斷是不是雙工（決定一端幾顆頭）
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

// 取得單顆接頭材料費
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

// 取得「每米線材單價」
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

// ✅ 把實際長度換成計價長度（每 0.5 m 往上取整）
function getBillingLength(meters) {
  if (!meters || meters <= 0) return 0;

  const STEP = 0.5;

  // 先把原始長度四捨五入到小數三位，避免 1.209999 這種浮點數誤差
  const normalized = Math.round(meters * 1000) / 1000;

  // 再用 0.5 m 級距往上取整
  return Math.ceil(normalized / STEP) * STEP;
}

// 計算線材費用
function calculateCableCost(meters, selections) {
  const jacket = selections.jacket;
  const fiberType = selections.fiberType;
  const fiberMode = selections.fiberMode || "SM";

  const perMeter = getCablePricePerMeter(jacket, fiberType, fiberMode);
  if (!perMeter) return 0;

  const effectiveLength = getBillingLength(meters);

  return Number((perMeter * effectiveLength).toFixed(4));
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

  const duplex = isDuplexPatch(fiberType, connectorA, connectorB);
  const connectorsPerEnd = duplex ? 2 : 1; // 單工 = 1, 雙工 = 2
  const totalConnectors = connectorsPerEnd * 2; // 兩端

  // 每端的單顆接頭材料費
  const unitA = getConnectorUnitPrice(
    connectorA,
    fiberMode,
    polishA,
    lowloss
  );
  const unitB = getConnectorUnitPrice(
    connectorB,
    fiberMode,
    polishB,
    lowloss
  );

  // 一條線的接頭材料費
  const connectorCost = (unitA + unitB) * connectorsPerEnd;

  // 一條線的工費
  const laborCost = totalConnectors * LABOR_PER_CONNECTOR_TW;

  return {
    connectorCost,
    laborCost,
    total: connectorCost + laborCost,
  };
}

// 整條線價格 = 接頭＋工費＋線材
function calculatePrice(meters, selections) {
  const { total: connectorAndLabor } = calculateConnectorAndLabor(selections);
  const cableCost = calculateCableCost(meters, selections);
  return Number((connectorAndLabor + cableCost).toFixed(2));
}

export default function Tools() {
  const formRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [currentSelections, setCurrentSelections] = useState(null);

  const handleGetValues = () => {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const selections = Object.fromEntries(formData.entries());
    setCurrentSelections(selections);

    const resultRows = LENGTH_TABLE.map((item) => ({
      meters: item.meters,
      label: item.label,
      price: calculatePrice(item.meters, selections),
    }));

    setRows(resultRows);
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
            {/* Connector A */}
            <div className="flex flex-col text-left">
              <label htmlFor="connectorA" className="mb-1 text-sm font-medium">
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
              <label htmlFor="polishA" className="mb-1 text-sm font-medium">
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
              <label htmlFor="connectorB" className="mb-1 text-sm font-medium">
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
              <label htmlFor="polishB" className="mb-1 text-sm font-medium">
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
              <label htmlFor="fiberMode" className="mb-1 text-sm font-medium">
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
              <label htmlFor="lowloss" className="mb-1 text-sm font-medium">
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
              <label htmlFor="fiberType" className="mb-1 text-sm font-medium">
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
              <label htmlFor="jacket" className="mb-1 text-sm font-medium">
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
        <h1 className="mb-4 text-2xl font-bold">工具頁面</h1>

        {currentSelections && (
          <div className="mb-4 text-sm text-slate-600 space-y-1">
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
                  接頭材料費：US$ {costDetail.connectorCost.toFixed(3)}
                </div>
                <div>工費：US$ {costDetail.laborCost.toFixed(2)}</div>
                <div className="font-semibold">
                  接頭＋工費小計：US$ {costDetail.total.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}

        {rows.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border text-sm bg-white">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Length</th>
                  <th className="border px-3 py-2 text-right">Price (USD)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="border px-3 py-1">{row.label}</td>
                    <td className="border px-3 py-1 text-right">
                      {row.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">
            請先在左邊選擇條件，然後按「取得目前所有選項」來產生長度價格表。
          </p>
        )}
      </main>
    </div>
  );
}
