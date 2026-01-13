'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { useRoomDetail } from '@/viewmodels/useRoomDetail';
import 'react-calendar/dist/Calendar.css';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// 한국 공휴일
const koreanHolidays = [
  '2024-01-01', '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12',
  '2024-03-01', '2024-05-05', '2024-05-15', '2024-06-06', '2024-08-15',
  '2024-09-16', '2024-09-17', '2024-09-18', '2024-10-03', '2024-10-09',
  '2024-12-25',
  '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-01',
  '2025-05-05', '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-09',
  '2025-12-25',
];

const isHoliday = (date: Date): boolean => {
  const dateStr = date.toISOString().split('T')[0];
  return koreanHolidays.includes(dateStr);
};

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;
  
  const { room, participants, votes, loading, error, joinRoom, handleCreateVote } = useRoomDetail(roomCode);
  
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [voteTitle, setVoteTitle] = useState('');
  const [showCreateVote, setShowCreateVote] = useState(false);

  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname');
    if (savedNickname) {
      setNickname(savedNickname);
      setIsJoined(true);
    }
  }, []);

  const onJoin = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    const success = await joinRoom(nickname);
    if (success) {
      localStorage.setItem('nickname', nickname);
      setIsJoined(true);
    }
  };

  const onDateClick = (value: Value) => {
    if (value instanceof Date) {
      const dateStr = value.toDateString();
      const isSelected = selectedDates.some(d => d.toDateString() === dateStr);
      
      if (isSelected) {
        setSelectedDates(selectedDates.filter(d => d.toDateString() !== dateStr));
      } else {
        setSelectedDates([...selectedDates, value]);
      }
    }
  };

  const onCreateVote = async () => {
    if (!voteTitle.trim()) {
      alert('투표 제목을 입력해주세요.');
      return;
    }
    if (selectedDates.length === 0) {
      alert('날짜를 선택해주세요.');
      return;
    }

    const dateStrings = selectedDates.map(d => d.toISOString());
    const success = await handleCreateVote(voteTitle, dateStrings);
    
    if (success) {
      setVoteTitle('');
      setSelectedDates([]);
      setShowCreateVote(false);
    }
  };

  // 날짜 타일 클래스
  const tileClassName = ({ date }: { date: Date }) => {
    const classes: string[] = [];
    
    const isSelected = selectedDates.some(d => d.toDateString() === date.toDateString());
    if (isSelected) {
      classes.push('selected-date');
    }
    
    if (isHoliday(date)) {
      classes.push('holiday');
    }
    
    return classes.join(' ');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-500">{error || '방을 찾을 수 없습니다.'}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* 상단 헤더 */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">{room.title}</h1>
          {room.memo && <p className="text-violet-100 text-sm">{room.memo}</p>}
          <p className="text-violet-200 text-xs mt-2">초대코드: {room.code}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 참가자 리스트 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">
            참가자 ({participants.length}명)
          </h2>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm"
              >
                {p.nickname}
              </span>
            ))}
            {participants.length === 0 && (
              <span className="text-gray-400 text-sm">아직 참가자가 없습니다</span>
            )}
          </div>
          
          {!isJoined && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 입력"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                maxLength={10}
              />
              <button
                onClick={onJoin}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
              >
                참가
              </button>
            </div>
          )}
        </div>

        {/* 캘린더 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">캘린더</h2>
          <Calendar
            onChange={onDateClick}
            tileClassName={tileClassName}
            className="w-full border-none"
            locale="ko-KR"
            calendarType="gregory"
            formatShortWeekday={(locale, date) => 
              ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
            }
          />
          
          {/* 선택된 날짜 표시 */}
          {selectedDates.length > 0 && (
            <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                선택된 날짜: {selectedDates.length}개
                </p>
                <div className="flex flex-wrap gap-2">
                {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())  // 날짜순 정렬
                    .map((d, i) => (
                    <span 
                        key={i} 
                        className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 pl-2 pr-1 py-1 rounded"
                    >
                        {d.toLocaleDateString('ko-KR')}
                        <button
                        onClick={() => {
                            setSelectedDates(selectedDates.filter(
                            date => date.toDateString() !== d.toDateString()
                            ));
                        }}
                        className="ml-1 w-4 h-4 rounded-full bg-violet-300 hover:bg-violet-500 text-white flex items-center justify-center text-xs font-bold"
                        >
                        ×
                        </button>
                    </span>
                    ))}
                </div>
            </div>
          )}


          {isJoined && selectedDates.length > 0 && (
            <button
              onClick={() => setShowCreateVote(true)}
              className="mt-4 w-full py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700"
            >
              이 날짜들로 투표 만들기
            </button>
          )}
        </div>

        {/* 투표 생성 모달 */}
        {showCreateVote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4 text-gray-800">투표 만들기</h3>
              <input
                type="text"
                value={voteTitle}
                onChange={(e) => setVoteTitle(e.target.value)}
                placeholder="투표 제목 (예: 1월 모임)"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 outline-none transition mb-4"
                maxLength={30}
              />
              <p className="text-sm text-gray-500 mb-4">
                선택된 날짜: {selectedDates.length}개
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateVote(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                  취소
                </button>
                <button
                  onClick={onCreateVote}
                  className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 진행중인 투표 리스트 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">
            진행중인 투표 ({votes.filter(v => v.isActive).length}개)
          </h2>
          <div className="space-y-3">
            {votes.filter(v => v.isActive).map((vote) => (
              <div
                key={vote.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <h3 className="font-medium text-gray-800">{vote.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {vote.dates.length}개 날짜 · {new Date(vote.createdAt).toLocaleDateString('ko-KR')} 생성
                </p>
                <button className="mt-2 text-sm text-violet-600 font-medium">
                  투표하기 →
                </button>
              </div>
            ))}
            {votes.filter(v => v.isActive).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                아직 진행중인 투표가 없습니다
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
