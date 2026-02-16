// 📁 문서 업데이트 자동화 유틸리티

interface DocumentUpdate {
  filePath: string;
  content?: string;
  timestamp?: Date;
  author?: string;
  changeType?: 'feature' | 'bugfix' | 'improvement' | 'documentation';
  id?: string;
}

class DocumentManager {
  private static updates: DocumentUpdate[] = [];

  // 문서 업데이트 자동 등록
  static registerUpdate(update: Partial<DocumentUpdate>) {
    this.updates.push({
      ...update,
      timestamp: update.timestamp || new Date(),
      id: update.id || `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    this.processUpdates();
  }

  // 큐에 있는 업데이트 처리
  private static async processUpdates() {
    if (this.updates.length === 0) return;

    const update = this.updates.shift();

    try {
      await this.writeDocument(update);
      console.log(`✅ 문서 업데이트 완료: ${update.filePath}`);
    } catch (error) {
      console.error(`❌ 문서 업데이트 실패: ${update.filePath}`, error);
      // 실패 시 큐에 다시 추가
      this.updates.unshift(update);
    }
  }

  // 문서 파일 쓰기
  private static async writeDocument(update: DocumentUpdate) {
    const fs = await import('fs').then(module => module.default);
    const path = require('path');

    const header = `# ${update.changeType?.toUpperCase() || 'UPDATE'}: ${update.filePath}\n\n`;
    const timestamp = `## 📅 업데이트 시간: ${update.timestamp?.toLocaleString('ko-KR') || new Date().toLocaleString('ko-KR')}\n`;
    const author = `## 👤 작성자: ${update.author || 'System'}\n`;
    const content = `## 📝 변경 내용\n\n${update.content || ''}`;

    const fullContent = `${header}${timestamp}${author}${content}\n\n---\n\n*이 업데이트는 자동화된 시스템에 의해 생성되었습니다.*`;

    await fs.promises.writeFile(path.resolve(update.filePath), fullContent, 'utf8');
  }
}

// 코드 수정 시 문서 업데이트 훅
export const useDocumentUpdate = (filePath: string) => {
  return (content: string, changeType: DocumentUpdate['changeType'] = 'improvement') => {
    DocumentManager.registerUpdate({
      filePath,
      content,
      changeType,
      author: 'System'
    });
  };
};
