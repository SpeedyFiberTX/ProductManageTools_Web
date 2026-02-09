// Metafields.jsx（節選）
import CardContent from "./CardContent";

export default function Metafields_Filter({ currentRow, canEdit, isChecked, toggleSelected }) {

    return (
        <div className="rounded-2xl border border-gray-300  bg-white p-6 shadow-sm">
            <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-700">Filter</h3>
                <div className="grid grid-cols-1 gap-4">
                    <CardContent
                        row={currentRow}
                        title="#Transceiver Type"
                        field="#Transceiver Type"
                        canEdit={canEdit}
                        selectKeys={["filter.transceiverType"]}
                        isChecked={isChecked(["filter.transceiverType"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Fiber Mode"
                        field="#Fiber Mode"
                        canEdit={canEdit}
                        selectKeys={["filter.fiberMode"]}
                        isChecked={isChecked(["filter.fiberMode"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Connector Type"
                        field="#Connector Type"
                        canEdit={canEdit}
                        selectKeys={["filter.connectorType"]}
                        isChecked={isChecked(["filter.connectorType"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#ConnectorA"
                        field="#ConnectorA"
                        canEdit={canEdit}
                        selectKeys={["filter.connector_a"]}
                        isChecked={isChecked(["filter.connector_a"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#ConnectorB"
                        field="#ConnectorB"
                        canEdit={canEdit}
                        selectKeys={["filter.connector_b"]}
                        isChecked={isChecked(["filter.connector_b"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Polish Type"
                        field="#Polish Type"
                        canEdit={canEdit}
                        selectKeys={["filter.polishType"]}
                        isChecked={isChecked(["filter.polishType"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Transmission Mode"
                        field="#Transmission Mode"
                        canEdit={canEdit}
                        selectKeys={["filter.transmissionMode"]}
                        isChecked={isChecked(["filter.transmissionMode"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Insertion Loss Grade"
                        field="#Insertion Loss Grade"
                        canEdit={canEdit}
                        selectKeys={["filter.insertionLossGrade"]}
                        isChecked={isChecked(["filter.insertionLossGrade"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Transmission Distance"
                        field="#Transmission Distance"
                        canEdit={canEdit}
                        selectKeys={["filter.transmissionDistance"]}
                        isChecked={isChecked(["filter.transmissionDistance"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Data Rate (Gbps)"
                        field="#Data Rate (Gbps)"
                        canEdit={canEdit}
                        selectKeys={["filter.data_rate_gbps"]}
                        isChecked={isChecked(["filter.data_rate_gbps"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Branch Type"
                        field="#Branch Type"
                        canEdit={canEdit}
                        selectKeys={["filter.branchType"]}
                        isChecked={isChecked(["filter.branchType"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Fiber Count"
                        field="#Fiber Count"
                        canEdit={canEdit}
                        selectKeys={["filter.fiberCount"]}
                        isChecked={isChecked(["filter.fiberCount"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Connector Gender"
                        field="#Connector Gender"
                        canEdit={canEdit}
                        selectKeys={["filter.connectorGender"]}
                        isChecked={isChecked(["filter.connectorGender"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Connector Color"
                        field="#Connector Color"
                        canEdit={canEdit}
                        selectKeys={["filter.connectorColor"]}
                        isChecked={isChecked(["filter.connectorColor"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Jacket Color"
                        field="#Jacket Color"
                        canEdit={canEdit}
                        selectKeys={["filter.jacketColor"]}
                        isChecked={isChecked(["filter.jacketColor"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Jacket"
                        field="#Jacket"
                        canEdit={canEdit}
                        selectKeys={["filter.jacket"]}
                        isChecked={isChecked(["filter.jacket"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Wavelength"
                        field="#Wavelength"
                        canEdit={canEdit}
                        selectKeys={["filter.wavelength_filter"]}
                        isChecked={isChecked(["filter.wavelength_filter"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Polarity"
                        field="#Polarity"
                        canEdit={canEdit}
                        selectKeys={["filter.polarity"]}
                        isChecked={isChecked(["filter.polarity"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Body Type"
                        field="#Body Type"
                        canEdit={canEdit}
                        selectKeys={["filter.bodyType"]}
                        isChecked={isChecked(["filter.bodyType"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#Gender"
                        field="#Gender"
                        canEdit={canEdit}
                        selectKeys={["filter.gender"]}
                        isChecked={isChecked(["filter.gender"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="#TAA"
                        field="#TAA"
                        canEdit={canEdit}
                        selectKeys={["filter.taa"]}
                        isChecked={isChecked(["filter.taa"])}
                        onToggle={toggleSelected} />
                    <CardContent
                        row={currentRow}
                        title="權重"
                        field="權重"
                        canEdit={canEdit}
                        selectKeys={["filter.weight"]}
                        isChecked={isChecked(["filter.weight"])}
                        onToggle={toggleSelected} />
                </div>
            </div>
        </div>
    );
}
