import { createRoot } from "react-dom/client";
import App from "./App";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import "./index.css";

// Create root first
const root = createRoot(document.getElementById("root")!);

// Then render with only the QueryClientProvider
// We'll handle the AuthProvider in App.tsx
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
