'use client';

import { useState, useEffect, useCallback } from 'react';
import { Room, Participant, Vote } from '@/models/types';
import { getRoomByCode } from '@/repositories/roomRepository';
import { getParticipantsByRoom, addParticipant } from '@/repositories/participantRepository';
import { getVotesByRoom, createVote, checkAndExpireVotes, deleteVote } from '@/repositories/voteRepository';
import { deleteRoom } from '@/repositories/roomRepository';

export const useRoomDetail = (roomCode: string) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 방 정보 로드
  const loadRoomData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 만료된 투표 확인 및 종료
      await checkAndExpireVotes(roomCode);

      const [roomData, participantsData, votesData] = await Promise.all([
        getRoomByCode(roomCode),
        getParticipantsByRoom(roomCode),
        getVotesByRoom(roomCode),
      ]);

      if (!roomData) {
        setError('존재하지 않는 방입니다.');
        return;
      }

      setRoom(roomData);
      setParticipants(participantsData);
      setVotes(votesData);
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // 참가자 등록
  const joinRoom = async (nickname: string): Promise<boolean> => {
    try {
      await addParticipant(roomCode, nickname);
      await loadRoomData(); // 새로고침
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 투표 생성
  const handleCreateVote = async (title: string, dates: string[]): Promise<boolean> => {
    try {
      await createVote(roomCode, title, dates);
      await loadRoomData(); // 새로고침
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 방 삭제
  const handleDeleteRoom = async (): Promise<boolean> => {
    try {
      await deleteRoom(roomCode);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 투표 삭제
  const handleDeleteVote = async (voteId: string): Promise<boolean> => {
    try {
      await deleteVote(voteId);
      await loadRoomData(); // 새로고침
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    if (roomCode) {
      loadRoomData();
    }
  }, [roomCode, loadRoomData]);

  return {
    room,
    participants,
    votes,
    loading,
    error,
    joinRoom,
    handleCreateVote,
    handleDeleteRoom,
    handleDeleteVote,
    refresh: loadRoomData,
  };
};
