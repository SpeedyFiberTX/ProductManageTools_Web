// 暫不使用，先用Notion算就好

import { useMemo, useState } from "react";

const category = [
  { value: "fiber_patch_cable", title: "常規跳線" },
  {
    value: "MTPMPO_Fiber",
    title: "MTPMPO 跳線",
    select: [
      {
        name: "fiber_mode",
        title: "Fiber Mode",
        options: [
          { value: "sm", title: "Single-Mode" },
          { value: "om3", title: "OM3" },
          { value: "om4", title: "OM4" },
        ],
      },
      {
        name: "fiber_mode",
        title: "Fiber Mode",
        options: [
          { value: "sm", title: "Single-Mode" },
          { value: "om3", title: "OM3" },
          { value: "om4", title: "OM4" },
        ],
      },
    ],
  },
];

export default function AmazonContent() {
  const [form, setForm] = useState({
    category: "",
    // 其他動態欄位會放進來，例如 fiber_mode
  });

  const selectedCategory = useMemo(
    () => category.find((c) => c.value === form.category),
    [form.category]
  );

  const selectors = selectedCategory?.select ?? [];

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // 切換 category 時，把不屬於該 category 的欄位清掉（避免殘留舊值）
  function handleCategoryChange(e) {
    const nextCategory = e.target.value;
    const nextConfig = category.find((c) => c.value === nextCategory);
    const allowedNames = new Set((nextConfig?.select ?? []).map((s) => s.name));

    setForm((prev) => {
      const next = { category: nextCategory };
      // 保留新 category 需要的欄位（如果你想保留就改這段）
      for (const key of Object.keys(prev)) {
        if (key === "category") continue;
        if (allowedNames.has(key)) next[key] = prev[key];
      }
      return next;
    });
  }

  function handleGenerate() {
    console.log("按鈕被按下");
    console.log("form:", form);
    // 你之後可以在這裡呼叫 API / 組 prompt
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* 左側：篩選側邊欄 */}
      <aside className="w-72 bg-white border-r shadow-sm">
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold">規格</h2>

          <form className="space-y-4">
            {/* 類別 */}
            <div className="flex flex-col text-left">
              <label htmlFor="category" className="mb-1 text-sm font-medium">
                category
              </label>
              <select
                name="category"
                id="category"
                className="bg-white p-2 rounded shadow border"
                value={form.category}
                onChange={handleCategoryChange}
              >
                <option value="">請選擇產品類別</option>
                {category.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 其他選項（依 category 動態渲染） */}
            {selectors.map((sel) => (
              <div key={sel.name} className="flex flex-col text-left">
                <label
                  htmlFor={sel.name}
                  className="mb-1 text-sm font-medium"
                >
                  {sel.title}
                </label>
                <select
                  id={sel.name}
                  name={sel.name}
                  className="bg-white p-2 rounded shadow border"
                  value={form[sel.name] ?? ""}
                  onChange={handleChange}
                >
                  <option value="">請選擇</option>
                  {sel.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.title}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </form>

          <button
            type="button"
            onClick={handleGenerate}
            className="mt-4 w-full rounded-md border border-slate-300 bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            產生文案
          </button>
        </div>
      </aside>

      {/* 右側：結果區 */}
      <main className="flex-1 p-6">這邊顯示結果</main>
    </div>
  );
}
