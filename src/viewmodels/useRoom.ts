'use client';

import { useState } from 'react';
import { Room } from '@/models/types';
import { createRoom, getRoomByCode } from '@/repositories/roomRepository';
import { addParticipant } from '@/repositories/participantRepository';

export const useRoom = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 방 생성
  const handleCreateRoom = async (
    title: string,
    nickname: string,
    memo?: string
  ): Promise<Room | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const room = await createRoom(title, nickname, memo);
      return room;
    } catch (err) {
      setError('방 생성에 실패했습니다.');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 방 입장
  const handleJoinRoom = async (code: string, nickname: string): Promise<Room | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const room = await getRoomByCode(code);
      if (!room) {
        setError('존재하지 않는 초대 코드입니다.');
        return null;
      }

      await addParticipant(code, nickname);
      return room;
    } catch (err) {
      setError('방 입장에 실패했습니다.');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    handleCreateRoom,
    handleJoinRoom,
  };
};
