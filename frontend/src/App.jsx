import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Toaster } from "@/components/ui/sonner";
import OnboardingService from '@/pages/OnboardingService';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

const { Pages, Layout, mainPage } = pagesConfig;

// LayoutWrapper: Layout이 있으면 감싸고, 없으면 그냥 children만 렌더링
const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* 🚨 [핵심 수정] 
         메인(/)으로 접속하면 -> 즉시 '/Home'으로 이동시킵니다. 
         (replace 옵션은 뒤로가기 했을 때 뺑뺑이 도는 걸 방지합니다)
      */}
      <Route path="/" element={<Navigate to="/Home" replace />} />

      {/* 혹시 몰라서 '/onboarding' 주소는 살려뒀습니다.
         나중에 필요하면 이 주소로 들어갈 수 있습니다.
      */}
      <Route path="/onboarding" element={
        <LayoutWrapper currentPageName="onboarding_view">
            <OnboardingService /> 
        </LayoutWrapper>
      } />

      {/* 나머지 페이지들 (Home도 여기에 포함되어 있을 겁니다) */}
      {Object.entries(Pages)
        .filter(([path]) => path !== '' && path !== 'dashboard')
        .map(([path, Page]) => (
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
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;