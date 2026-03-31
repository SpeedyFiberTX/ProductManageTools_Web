import { Outlet } from "react-router-dom";
import { CsvProvider } from "../stores/CsvProvider";

export default function ShopifyCsvLayout() {
  return (
    <CsvProvider>
      <Outlet />
    </CsvProvider>
  );
}
