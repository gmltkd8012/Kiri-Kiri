export interface Room {
    id: string;
    code: string;           // 초대 코드 (12 자리)
    title: string;          // 방 제목
    memo?: string;          // 메모
    hostNickname: string;   // 방장 닉네임
    createdAt: Date;        // 생성 일시
}

// 투표 타입
export interface Vote {
  odId: string;
  odCode: string;           // 방 코드
  nickname: string;       // 투표자 닉네임
  selectedDates: Date[];  // 선택한 날짜들 (복수)
  createdAt: Date;
}

// 참여자 타입
export interface Participant {
  nickname: string;
  joinedAt: Date;
}