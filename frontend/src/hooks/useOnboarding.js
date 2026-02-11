import { useState } from 'react';
import {
  connectConfluence,
  getCategories,
  filterPages,
  initializeEmbedding,
  embedPages,
  getCollectionInfo
} from '../api';
import { toast } from 'sonner';

export const useOnboarding = (props) => {
  // 1. Hook 내부 로컬 상태
  const [formData, setFormData] = useState({
    base_url: 'https://your-domain.atlassian.net/wiki',
    email: 'user@example.com',
    api_token: '',
    space_key: ''
  });
  const [loading, setLoading] = useState({});
  const [selectedLevel1, setSelectedLevel1] = useState('전체');
  const [selectedLevel2, setSelectedLevel2] = useState('전체');

  const setLoadingState = (key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  // 2. 비즈니스 로직 함수들
  // ⚠️ 중요: 모든 주소에서 '/api'를 제거했습니다. (baseURL에 포함되어 있음)

  // Confluence 연결
  const handleConfluenceConnect = async () => {
    if (!formData.api_token) return toast.error('API 토큰을 입력해주세요');
    setLoadingState('confluence', true);
    try {
      const response = await connectConfluence(formData);
      props.setConfluenceConnected(true);
      props.setConfluenceConfig(formData);
      toast.success(response.data.message || '연결 성공!');
    } catch (error) {
      toast.error(error.response?.data?.detail || '연결 실패');
    } finally {
      setLoadingState('confluence', false);
    }
  };

  // 카테고리 로드
  const handleLoadCategories = async () => {
    if (!props.confluenceConfig) return;
    setLoadingState('categories', true);
    try {
      const response = await getCategories(props.confluenceConfig);
      props.setCategoriesData(response.data);
      props.setCategoriesLoaded(true);

      if (response.data.pages?.length > 0) {
        props.setFilteredPageIds(response.data.pages.map(p => p.id));
        toast.success(`${response.data.total_pages}개 페이지 로드 완료!`);
      }
      // ✅ 문법 에러 유발하던 stray 코드를 제거했습니다.
    } catch (error) {
      toast.error('카테고리 로드 실패');
    } finally {
      setLoadingState('categories', false);
    }
  };

  // 페이지 필터링
  const handleFilterPages = async () => {
    if (!props.confluenceConfig) return;
    setLoadingState('filter', true);
    const filters = {};
    if (selectedLevel1 !== '전체') filters.level_1 = selectedLevel1;
    if (selectedLevel2 !== '전체') filters.level_2 = selectedLevel2;

    try {
      const response = await filterPages(props.confluenceConfig, filters);
      props.setFilteredPageIds(response.data.page_ids);
      toast.success(`${response.data.count}개 페이지 필터링 완료`);
    } catch (error) {
      toast.error('필터링 실패');
    } finally {
      setLoadingState('filter', false);
    }
  };

  // 임베딩 초기화
  const handleInitializeEmbedding = async () => {
    setLoadingState('init', true);
    try {
      const response = await initializeEmbedding();
      props.setEmbeddingInitialized(true);
      props.setCollectionInfo(response.data.collection_info);
      toast.success('임베딩 초기화 완료');
    } catch (error) {
      toast.error('초기화 실패');
    } finally {
      setLoadingState('init', false);
    }
  };

  // 페이지 임베딩 실행
  const handleEmbedPages = async () => {
    if (!props.confluenceConfig || props.filteredPageIds.length === 0) return;
    setLoadingState('embed', true);
    try {
      const response = await embedPages({
        ...props.confluenceConfig,
        page_ids: props.filteredPageIds.map(id => String(id))
      });
      toast.success(response.data.message || '임베딩 완료');
    } catch (error) {
      toast.error('임베딩 실패');
    } finally {
      setLoadingState('embed', false);
    }
  };

  // 컬렉션 정보 조회
  const handleGetCollectionInfo = async () => {
    setLoadingState('info', true);
    try {
      const response = await getCollectionInfo();
      props.setCollectionInfo(response.data.collection_info);
      toast.success('정보 업데이트 완료');
    } catch (error) {
      toast.error('조회 실패');
    } finally {
      setLoadingState('info', false);
    }
  };

  // 외부에서 사용할 상태와 함수들을 리턴
  return {
    formData, setFormData,
    loading,
    selectedLevel1, setSelectedLevel1,
    selectedLevel2, setSelectedLevel2,
    handleConfluenceConnect,
    handleLoadCategories,
    handleFilterPages,
    handleInitializeEmbedding,
    handleEmbedPages,
    handleGetCollectionInfo
  };
};