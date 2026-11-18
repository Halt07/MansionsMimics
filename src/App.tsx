import { Suspense, type ReactNode } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { pagesConfig, type PageName } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

const { Pages, Layout, mainPage } = pagesConfig;
const MainPage = Pages[mainPage];

const LayoutWrapper = ({ children, currentPageName }: { children: ReactNode; currentPageName: PageName }) =>
  <Layout currentPageName={currentPageName}>{children}</Layout>;

/** Shown while a lazy-loaded page's code arrives (see pages.config.ts). */
const PageLoading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-label="Loading" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<PageLoading />}>
  <Routes>
    <Route path="/" element={
      <LayoutWrapper currentPageName={mainPage}>
        <MainPage />
      </LayoutWrapper>
    } />
    {(Object.entries(Pages) as [PageName, (typeof Pages)[PageName]][]).map(([path, Page]) => (
      <Route
        key={path}
        path={`/${path}`}
        element={
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        }
      />
    ))}
    <Route path="*" element={<PageNotFound />} />
  </Routes>
  </Suspense>
);

function App() {
  return (
    <>
      <Router>
        <AppRoutes />
      </Router>
      <Toaster />
    </>
  )
}

export default App
