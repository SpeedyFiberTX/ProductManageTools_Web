// Metafields.jsx（節選）
import CardContent from "./CardContent";

export default function Metafields_Recommendation({ currentRow, canEdit, isChecked, toggleSelected }) {

    return (
        <div className="rounded-2xl border border-gray-300  bg-white p-6 shadow-sm">
            <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-700">關聯</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <CardContent
                    row={currentRow}
                    title="關聯產品"
                    field="關聯產品"
                    canEdit={canEdit}
                    selectKeys={["recommendation.related_products"]}
                    isChecked={isChecked(["recommendation.related_products"])}
                    onToggle={toggleSelected} />
            </div>
        </div>
    );
}
