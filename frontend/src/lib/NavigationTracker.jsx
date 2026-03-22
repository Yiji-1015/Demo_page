import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
// import { base44 } from '@/api/base44Client'; // ❌ 삭제: 더 이상 사용 안 함
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    
    // pagesConfig가 혹시 없을 경우를 대비한 안전장치 추가
    const Pages = pagesConfig?.Pages || {};
    const mainPage = pagesConfig?.mainPage;
    const mainPageKey = mainPage ?? (Object.keys(Pages)[0] || 'Home');

    // 1. iframe 통신용 (Base44 대시보드 안에서 쓸 때 필요한 건데, 일단 에러 안 나니 둡니다)
    useEffect(() => {
        window.parent?.postMessage({
            type: "app_changed_url",
            url: window.location.href
        }, '*');
    }, [location]);

    // 2. 페이지 방문 로그 기록 (수정됨)
    useEffect(() => {
        const pathname = location.pathname;
        let pageName;
        
        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );
            pageName = matchedKey || pathSegment; // 매칭 안되면 주소 그대로 사용
        }

        if (isAuthenticated && pageName) {
            // ❌ 기존 코드: base44.appLogs.logUserInApp(pageName)...
            
            // ✅ 변경 코드: 그냥 개발자 콘솔에만 찍어줍니다.
            // 나중에 Google Analytics 같은 거 붙일 때 여기다가 넣으면 됩니다.
            console.log(`[Page View] 사용자 방문: ${pageName}`);
        }
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}