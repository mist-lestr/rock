import Layout from "@/components/app/layout";
import ThemeProvider from "@/components/app/theme-provider";
import Navbar from "@/components/app/navbar";
import Sidebar from "@/components/app/sidebar/sidebar";
import RouteSwitcher from "@/components/app/route-switcher";
import { BrowserRouter } from 'react-router';
import { loadServices } from "@/lib/services";
import { loadPlugins } from "./plugins"
import { useEffect } from "react";

export function App() {

  loadPlugins()
  loadServices()

  console.log("Load app")

  useEffect(() => {
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Layout navbar={<Navbar />} sidebar={<Sidebar />}>
          <RouteSwitcher />
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;