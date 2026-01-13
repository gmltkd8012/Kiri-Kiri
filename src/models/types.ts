export interface Room {
    id: string;
    code: string;           // 초대 코드 (12 자리)
    title: string;          // 방 제목
    memo?: string;          // 메모
    hostNickname: string;   // 방장 닉네임
    createdAt: Date;        // 생성 일시
}

// 참가자 타입
export interface Participant {
  id: string;
  roomCode: string;       // 방 코드
  nickname: string;       // 닉네임
  joinedAt: Date;         // 입장 시간
}

// 투표 타입
export interface Vote {
  id: string;
  roomCode: string;       // 방 코드
  title: string;          // 투표 제목
  dates: string[];        // 투표 가능한 날짜들 (ISO string)
  createdAt: Date;
  isActive: boolean;      // 진행중 여부
}

// 투표 응답 타입 (누가 어떤 날짜에 투표했는지)
export interface VoteResponse {
  id: string;
  voteId: string;         // 투표 ID
  nickname: string;       // 투표자 닉네임
  selectedDates: string[]; // 선택한 날짜들
  createdAt: Date;
}