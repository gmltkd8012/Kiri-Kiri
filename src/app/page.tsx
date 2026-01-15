'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRoom } from '@/viewmodels/useRoom';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, error, handleCreateRoom, handleJoinRoom } = useRoom();

  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [isInvited, setIsInvited] = useState(false);

  // URL에서 초대 코드 자동 설정
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setInviteCode(code.toUpperCase());
      setIsInvited(true);
      setMode('join');
    }
  }, [searchParams]);

  const onJoinRoom = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    if (!inviteCode.trim()) {
      alert('초대 코드를 입력해주세요.');
      return;
    }

    const room = await handleJoinRoom(inviteCode, nickname);
    if (room) {
      localStorage.setItem('nickname', nickname);
      router.push(`/room/${room.code}`);
    }
  };

  const onCreateRoom = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    if (!roomTitle.trim()) {
      alert('방 제목을 입력해주세요.');
      return;
    }

    const room = await handleCreateRoom(roomTitle, nickname, memo || undefined);
    if (room) {
      localStorage.setItem('nickname', nickname);
      router.push(`/room/${room.code}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">끼리끼리</h1>
          <p className="text-gray-500">친구들과 모임 날짜를 정해보세요</p>
        </div>

        {/* 탭 전환 (초대 링크로 들어온 경우 숨김) */}
        {!isInvited && (
          <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
            <button
              className={`flex-1 py-2.5 rounded-lg font-semibold transition ${
                mode === 'join'
                  ? 'bg-white shadow text-violet-600'
                  : 'text-gray-500'
              }`}
              onClick={() => setMode('join')}
            >
              방 입장
            </button>
            <button
              className={`flex-1 py-2.5 rounded-lg font-semibold transition ${
                mode === 'create'
                  ? 'bg-white shadow text-violet-600'
                  : 'text-gray-500'
              }`}
              onClick={() => setMode('create')}
            >
              방 만들기
            </button>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* 닉네임 입력 (공통) */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            닉네임
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 outline-none transition"
            maxLength={10}
          />
        </div>

        {/* 방 입장 모드 */}
        {mode === 'join' && (
          <>
            {/* 초대 링크로 들어온 경우 안내 메시지 표시 */}
            {isInvited && (
              <div className="mb-4 p-3 bg-violet-100 text-violet-700 rounded-xl text-sm text-center">
                초대받은 방에 입장합니다. 닉네임을 입력해주세요!
              </div>
            )}

            {/* 초대 링크가 아닌 경우에만 초대 코드 입력 표시 */}
            {!isInvited && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  초대 코드
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="12자리 초대코드를 입력해 주세요."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 outline-none transition"
                  maxLength={12}
                />
              </div>
            )}

            <button
              onClick={onJoinRoom}
              disabled={loading}
              className="w-full py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '입장 중...' : '방 입장하기'}
            </button>
          </>
        )}

        {/* 방 생성 모드 */}
        {mode === 'create' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                방 제목
              </label>
              <input
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="간단한 모임명 정해주세요."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 outline-none transition"
                maxLength={20}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                메모 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="모임에 대한 간단한 설명해주세요."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 outline-none transition resize-none"
                rows={3}
                maxLength={100}
              />
            </div>
            <button
              onClick={onCreateRoom}
              disabled={loading}
              className="w-full py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
