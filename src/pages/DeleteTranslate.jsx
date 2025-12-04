import { useState } from "react";
import { useCsv } from "../stores/useCsv";
import EmptyState from "../component/EmptyState";
import RequireColumn from "../component/RequireColumn";
import AsideList from "../component/AsideList";
import Hero from "../component/Hero";


export default function DeleteTranslate() {
  const {
    // 原始資料與狀態
    rows,currentRow, selectedIndex, setIndex,
  } = useCsv();


  const handleSubmitAll = async () => {


    // try {
    //   console.log('開始執行刪除翻譯')
    //   const resp = await fetch('/api/deleteTranslate', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ rows: productPayloads }),
    //   });
    //   const data = await resp.json();
    //   if (!resp.ok || !data.ok) {
    //     alert(`有部分失敗，請查看回傳摘要`);
    //   } else {
    //     alert(`刪除完成：${productPayloads.length}`);
    //   }
    // } catch (e) {
    //   console.error(e);
    //   alert('送出失敗：' + e.message);
    // }

  };

    // ✅ 全域・勾選的 payload keys
    const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  
    const toggleSelected = (keys = [], checked) => {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        for (const k of keys) {
          if (!k) continue;
          if (checked) next.add(k);
          else next.delete(k);
        }
        return next;
      });
    };
  
    const isChecked = (keys = []) => keys.every((k) => selectedKeys.has(k));
  


  return (
    <>
      <Hero pageTitle="刪除日文翻譯" onSubmit={handleSubmitAll} />

      <div className="container mx-auto px-4 py-8">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            <AsideList rows={rows} selectedProductIndex={selectedIndex} setSelectedProductIndex={setIndex} />

            <main className="col-span-12 md:col-span-9">
              {currentRow ? (
                <div className="flex flex-col gap-3">
                  <RequireColumn rows={rows} selectedProductIndex={selectedIndex} currentRow={currentRow} canEdit={false} isChecked={isChecked}
                    toggleSelected={toggleSelected}/>
                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-slate-500">尚未選擇資料或資料尚未載入</p>
                </div>
              )}
            </main>

            <section className="col-span-12 md:col-span-3">
              {currentRow ? (
                <div className="flex flex-col gap-3">
                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-slate-500">尚未選擇資料或資料尚未載入</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
