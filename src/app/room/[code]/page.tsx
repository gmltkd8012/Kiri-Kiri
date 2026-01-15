'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { useRoomDetail } from '@/viewmodels/useRoomDetail';
import { getVoteResponses, submitVoteResponse, getVoteParticipants } from '@/repositories/voteRepository';
import { VoteResponse } from '@/models/types';
import { shareVoteToKakao, shareRoomToKakao } from '@/utils/kakaoShare';
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
  
  const { room, participants, votes, loading, error, joinRoom, handleCreateVote, handleDeleteRoom, handleDeleteVote } = useRoomDetail(roomCode);

  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [voteTitle, setVoteTitle] = useState('');
  const [showCreateVote, setShowCreateVote] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState<typeof votes[0] | null>(null);
  const [voteResponses, setVoteResponses] = useState<{ [key: string]: string[] }>({});
  const [mySelectedDates, setMySelectedDates] = useState<string[]>([]);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'room' | 'vote', id?: string } | null>(null);
  const [voteDropdowns, setVoteDropdowns] = useState<{ [key: string]: boolean }>({});
  const [voteParticipantsMap, setVoteParticipantsMap] = useState<{ [voteId: string]: string[] }>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastCreatedVoteTitle, setLastCreatedVoteTitle] = useState('');

  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname');
    if (savedNickname) {
      setNickname(savedNickname);
      setIsJoined(true);
    }
  }, []);

  // 투표 목록이 변경될 때마다 각 투표의 참여자 정보 로드
  useEffect(() => {
    const loadVoteParticipants = async () => {
      const participantsMap: { [voteId: string]: string[] } = {};

      for (const vote of votes) {
        try {
          const participants = await getVoteParticipants(vote.id);
          participantsMap[vote.id] = participants;
        } catch (err) {
          console.error(`투표 ${vote.id} 참여자 로드 실패:`, err);
          participantsMap[vote.id] = [];
        }
      }

      setVoteParticipantsMap(participantsMap);
    };

    if (votes.length > 0) {
      loadVoteParticipants();
    }
  }, [votes]);

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
      setLastCreatedVoteTitle(voteTitle);
      setVoteTitle('');
      setSelectedDates([]);
      setShowCreateVote(false);
      setShowShareModal(true); // 공유 모달 표시
    }
  };

  // 투표 모달 열기
  const openVoteModal = async (vote: typeof votes[0]) => {
    setSelectedVote(vote);
    setShowVoteModal(true);

    // 기존 투표 응답 불러오기
    try {
      const responses = await getVoteResponses(vote.id);

      // 날짜별로 투표한 사람들 정리
      const responseMap: { [key: string]: string[] } = {};
      vote.dates.forEach(date => {
        responseMap[date] = [];
      });

      responses.forEach((response: VoteResponse) => {
        response.selectedDates.forEach(date => {
          if (!responseMap[date]) {
            responseMap[date] = [];
          }
          responseMap[date].push(response.nickname);
        });
      });

      setVoteResponses(responseMap);

      // 내가 선택한 날짜 불러오기
      const myResponse = responses.find((r: VoteResponse) => r.nickname === nickname);
      if (myResponse) {
        setMySelectedDates(myResponse.selectedDates);
      } else {
        setMySelectedDates([]);
      }
    } catch (err) {
      console.error('투표 응답 불러오기 실패:', err);
    }
  };

  // 투표 제출
  const onSubmitVote = async () => {
    if (!selectedVote || !nickname) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (mySelectedDates.length === 0) {
      alert('최소 1개의 날짜를 선택해주세요.');
      return;
    }

    try {
      await submitVoteResponse(selectedVote.id, nickname, mySelectedDates);
      alert('투표가 완료되었습니다!');
      setShowVoteModal(false);
      setSelectedVote(null);
      setMySelectedDates([]);
    } catch (err) {
      console.error('투표 제출 실패:', err);
      alert('투표 제출에 실패했습니다.');
    }
  };

  // 투표 날짜 토글
  const toggleVoteDate = (dateStr: string) => {
    if (mySelectedDates.includes(dateStr)) {
      setMySelectedDates(mySelectedDates.filter(d => d !== dateStr));
    } else {
      setMySelectedDates([...mySelectedDates, dateStr]);
    }
  };

  // 방 삭제 확인
  const confirmDeleteRoom = () => {
    setDeleteTarget({ type: 'room' });
    setShowDeleteConfirm(true);
    setShowRoomDropdown(false);
  };

  // 투표 삭제 확인
  const confirmDeleteVote = (voteId: string) => {
    setDeleteTarget({ type: 'vote', id: voteId });
    setShowDeleteConfirm(true);
    setVoteDropdowns({});
  };

  // 삭제 실행
  const executeDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'room') {
        const success = await handleDeleteRoom();
        if (success) {
          alert('방이 삭제되었습니다.');
          window.location.href = '/';
        } else {
          alert('방 삭제에 실패했습니다.');
        }
      } else if (deleteTarget.type === 'vote' && deleteTarget.id) {
        const success = await handleDeleteVote(deleteTarget.id);
        if (success) {
          alert('투표가 삭제되었습니다.');
        } else {
          alert('투표 삭제에 실패했습니다.');
        }
      }
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // 투표 드롭다운 토글
  const toggleVoteDropdown = (voteId: string) => {
    setVoteDropdowns(prev => ({
      ...prev,
      [voteId]: !prev[voteId]
    }));
  };

  // 투표자 명단 확인
  const fetchVoters = async (voteId: string) => {
    const voters = await getVoteParticipants(voteId);
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
        <div className="max-w-2xl mx-auto relative">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{room.title}</h1>
              {room.memo && <p className="text-violet-100 text-sm">{room.memo}</p>}
              <p className="text-violet-200 text-xs mt-2">초대코드: {room.code}</p>
            </div>

            {/* 방장만 보이는 삭제 버튼 */}
            {nickname === room.hostNickname && (
              <div className="relative">
                <button
                  onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>

                {showRoomDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-50">
                    <button
                      onClick={confirmDeleteRoom}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      방 삭제
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* 공유 모달 */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-2 text-gray-800">투표가 생성되었습니다! 🎉</h3>
              <p className="text-sm text-gray-600 mb-6">
                친구들에게 투표를 공유해보세요
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    shareVoteToKakao(room.title, lastCreatedVoteTitle, roomCode);
                    setShowShareModal(false);
                  }}
                  className="w-full py-3 bg-[#FEE500] hover:bg-[#FDD835] text-gray-800 rounded-xl font-medium flex items-center justify-center gap-2 transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.5 1.37 4.77 3.55 6.36-.2.75-.75 2.64-.81 2.83-.07.22.08.22.18.16.08-.05 2.54-1.68 3.24-2.14.91.23 1.88.35 2.84.35 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
                  </svg>
                  카카오톡으로 공유하기
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  나중에 하기
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
              <div key={vote.id} className="relative">
                <div
                  onClick={() => openVoteModal(vote)}
                  className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 hover:border-violet-300 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{vote.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {vote.dates.length}개 날짜 · {new Date(vote.createdAt).toLocaleDateString('ko-KR')} 생성
                      </p>

                      {/* 참여자 정보 */}
                      {voteParticipantsMap[vote.id] && voteParticipantsMap[vote.id].length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 items-center">
                          <span className="text-xs text-gray-500">참여:</span>
                          {voteParticipantsMap[vote.id].slice(0, 3).map((nickname, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full"
                            >
                              {nickname}
                            </span>
                          ))}
                          {voteParticipantsMap[vote.id].length > 3 && (
                            <span className="text-xs text-gray-500">
                              외 {voteParticipantsMap[vote.id].length - 3}명
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-2 text-sm text-violet-600 font-medium">
                        투표하기 →
                      </p>
                    </div>

                    {/* 투표 삭제 버튼 (누구나 삭제 가능) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVoteDropdown(vote.id);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {voteDropdowns[vote.id] && (
                  <div className="absolute right-2 top-12 w-36 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareVoteToKakao(room.title, vote.title, roomCode);
                        setVoteDropdowns({});
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                      </svg>
                      공유하기
                    </button>
                    <button
                      onClick={() => confirmDeleteVote(vote.id)}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                    >
                      투표 삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
            {votes.filter(v => v.isActive).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                아직 진행중인 투표가 없습니다
              </p>
            )}
          </div>
        </div>

        {/* 종료된 투표 리스트 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">
            종료된 투표 ({votes.filter(v => !v.isActive).length}개)
          </h2>
          <div className="space-y-3">
            {votes.filter(v => !v.isActive).map((vote) => (
              <div key={vote.id} className="relative">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{vote.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {vote.dates.length}개 날짜 · {new Date(vote.expireAt).toLocaleDateString('ko-KR')} 종료
                      </p>

                      {/* 참여자 정보 */}
                      {voteParticipantsMap[vote.id] && voteParticipantsMap[vote.id].length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 items-center">
                          <span className="text-xs text-gray-500">참여:</span>
                          {voteParticipantsMap[vote.id].slice(0, 3).map((nickname, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {nickname}
                            </span>
                          ))}
                          {voteParticipantsMap[vote.id].length > 3 && (
                            <span className="text-xs text-gray-500">
                              외 {voteParticipantsMap[vote.id].length - 3}명
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-2 text-sm text-violet-600 font-medium">
                        결과 보기 →
                      </p>
                    </div>

                    {/* 투표 삭제 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVoteDropdown(vote.id);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {voteDropdowns[vote.id] && (
                  <div className="absolute right-2 top-12 w-36 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        shareVoteToKakao(room.title, vote.title, roomCode);
                        setVoteDropdowns({});
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                      </svg>
                      공유하기
                    </button>
                    <button
                      onClick={() => confirmDeleteVote(vote.id)}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                    >
                      투표 삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
            {votes.filter(v => !v.isActive).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">
                종료된 투표가 없습니다
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 투표 모달 */}
      {showVoteModal && selectedVote && (() => {
        // 날짜별 투표 수 계산
        const voteCounts = selectedVote.dates.map(dateStr => ({
          date: dateStr,
          count: (voteResponses[dateStr] || []).length
        }));

        // 최다 득표 수 찾기
        const maxVotes = Math.max(...voteCounts.map(v => v.count), 0);

        // 최다 득표 날짜들 (동점 포함)
        const topDates = voteCounts
          .filter(v => v.count === maxVotes && maxVotes > 0)
          .map(v => v.date);

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-2 text-gray-800">{selectedVote.title}</h3>
              <p className="text-sm text-gray-500 mb-2">
                참여 가능한 날짜를 선택해주세요 (중복 선택 가능)
              </p>

              {/* 가장 유력한 날짜 표시 */}
              {topDates.length > 0 && (
                <div className="mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
                  <p className="text-xs text-violet-600 font-semibold mb-1">
                    가장 유력한 날짜
                  </p>
                  <div className="space-y-0.5">
                    {topDates
                      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                      .map((dateStr, idx) => {
                        const date = new Date(dateStr);
                        return (
                          <p key={idx} className="text-sm text-violet-700 font-medium">
                            {date.toLocaleDateString('ko-KR', {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </p>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 날짜 목록 */}
              <div className="space-y-3 mb-6">
              {selectedVote.dates
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                .map((dateStr) => {
                  const date = new Date(dateStr);
                  const isSelected = mySelectedDates.includes(dateStr);
                  const voters = voteResponses[dateStr] || [];

                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleVoteDate(dateStr)}
                      className={`w-full p-4 rounded-xl border-2 transition text-left ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 bg-white hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">
                              {date.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </p>
                            <span className="text-xs font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                              {voters.length}명
                            </span>
                          </div>
                          {voters.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {voters.map((voterName, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full"
                                >
                                  {voterName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-violet-500 bg-violet-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowVoteModal(false);
                    setSelectedVote(null);
                    setMySelectedDates([]);
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={onSubmitVote}
                  disabled={mySelectedDates.length === 0}
                  className={`flex-1 py-3 rounded-xl font-medium ${
                    mySelectedDates.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-violet-600 text-white hover:bg-violet-700'
                  }`}
                >
                  투표하기 ({mySelectedDates.length})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-gray-800">
              {deleteTarget.type === 'room' ? '방 삭제' : '투표 삭제'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {deleteTarget.type === 'room'
                ? '방을 삭제하면 모든 투표와 참여자 정보가 함께 삭제됩니다. 정말 삭제하시겠습니까?'
                : '투표를 삭제하면 모든 투표 응답이 함께 삭제됩니다. 정말 삭제하시겠습니까?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
