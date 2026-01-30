import { Routes, Route } from 'react-router';
import { Suspense } from 'react';
import Home from '@/components/Home'
import { routesStore } from '@/lib/router/Route'
import { useStore } from '@tanstack/react-store'
import { Callback } from '@/Callback';

export default function RouteSwitcher() {
  const routes = useStore(routesStore, (state) => Object.values(state));

  console.log("reload route switcher", routes)

  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Routes déclarées par les plugins */}
        {routes.map(({ path, component: Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}

        {/* Routes « stand‑alone » du shell */}
        <Route path="/" element={<Home />} />
        <Route path="callback" element={<Callback />} />
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </Suspense>
  )
}