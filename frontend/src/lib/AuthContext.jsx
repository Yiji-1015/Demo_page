import React, { createContext, useState, useContext, useEffect } from 'react';
// import client from '@/api/client'; // 나중에 백엔드 연동할 때 주석 해제

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      
      // 1. 로컬 스토리지에서 토큰 확인 (간단한 버전)
      const token = localStorage.getItem('accessToken');

      if (token) {
        // 토큰이 있으면 로그인된 것으로 간주 (임시)
        // 나중에는 여기서 client.get('/api/me')를 호출해서 진짜 유효한지 확인해야 함
        setUser({
          id: 1,
          full_name: "Admin User",
          email: "admin@company.com",
          role: "admin"
        });
        setIsAuthenticated(true);
      } else {
        // 토큰 없으면 로그아웃 상태
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // ★ 로그인 함수 (새로 추가됨)
  const login = async (email, password) => {
    try {
      // 지금은 무조건 성공하게 처리 (백엔드 API 생기면 아래 로직으로 교체)
      /*
      const res = await client.post('/api/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('accessToken', token);
      setUser(user);
      */
     
      // [임시 로직] 가짜 토큰 저장
      localStorage.setItem('accessToken', 'dummy_token_12345');
      setUser({ full_name: "Admin User", email: email });
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const logout = () => {
    // 저장된 토큰 삭제
    localStorage.removeItem('accessToken');
    setUser(null);
    setIsAuthenticated(false);
    // 필요하면 로그인 페이지로 이동
    // window.location.href = '/login'; 
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      login,  // 새로 추가된 로그인 기능
      logout,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};