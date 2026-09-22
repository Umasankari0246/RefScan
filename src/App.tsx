import { RouterProvider } from "react-router";
import { router } from "./routes";
import { RefScanProvider } from "./context/RefScanContext";

export default function App() {
  return (
    <RefScanProvider>
      <RouterProvider router={router} />
    </RefScanProvider>
  );
}
