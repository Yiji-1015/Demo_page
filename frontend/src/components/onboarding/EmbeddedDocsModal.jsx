import React, { useState } from 'react';
import { onboardingApi } from '@/api/client';

export default function EmbeddedDocsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  // 백엔드 API 호출 함수
  const fetchEmbeddedDocs = async () => {
    setLoading(true);
    try {
      const response = await onboardingApi.get('/documents/embedded');

      // axios는 응답을 자동으로 파싱해서 response.data에 담아줌
      const result = response.data;

      // 데이터가 예쁘게 들어왔는지 확인
      if (result.status === 'success') {
        setDocs(result.data || []);
      } else {
        alert('데이터를 불러오는데 실패했습니다: ' + (result.message || '알 수 없는 에러'));
      }
    } catch (error) {
      console.error('API 호출 에러:', error);
      alert('서버와 연결할 수 없습니다. IP 주소나 서버 상태를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchEmbeddedDocs();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* 1. 트리거 버튼 */}
      <button 
        onClick={handleOpen}
        style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#0052CC', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        📊 임베딩 DB 확인
      </button>

      {/* 2. 모달 팝업창 영역 */}
      {isOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.header}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>📚 현재 DB에 저장된 문서 목록 ({docs.length}개)</h2>
              <button onClick={handleClose} style={styles.closeBtn}>X</button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>데이터를 불러오는 중입니다... ⏳</p>
            ) : docs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>DB에 저장된 문서가 없습니다.</p>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Space</th>
                      <th style={styles.th}>제목</th>
                      <th style={styles.th}>작성자</th>
                      <th style={styles.th}>본문 미리보기</th>
                      <th style={styles.th}>링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}><b>{doc.space || '-'}</b></td>
                        <td style={styles.td}>{doc.title || '제목 없음'}</td>
                        <td style={styles.td}>{doc.primary_contributor || '작성자 없음'}</td>
                        <td style={styles.td}>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {doc.content_preview || '내용 없음'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0052CC', textDecoration: 'none' }}>
                            보러가기
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// 🎨 심플한 팝업창 스타일 (오류가 나던 hover 부분 삭제 및 레이아웃 최적화)
const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  modal: {
    backgroundColor: 'white', padding: '20px', borderRadius: '8px',
    width: '90%', maxWidth: '1000px', maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '15px'
  },
  closeBtn: {
    padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold', 
    border: 'none', background: 'transparent', fontSize: '16px'
  },
  tableContainer: {
    overflowY: 'auto', 
    flex: 1
  },
  table: {
    width: '100%', borderCollapse: 'collapse', textAlign: 'left'
  },
  th: {
    backgroundColor: '#f4f5f7', padding: '12px', borderBottom: '2px solid #ddd', 
    position: 'sticky', top: 0, zIndex: 1
  },
  td: {
    padding: '12px', borderBottom: '1px solid #eee'
  }
};