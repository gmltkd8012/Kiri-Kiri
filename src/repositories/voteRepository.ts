import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { Vote, VoteResponse } from '@/models/types';

const VOTES_COLLECTION = 'votes';
const RESPONSES_COLLECTION = 'voteResponses';

// 투표 생성
export const createVote = async (
  roomCode: string,
  title: string,
  dates: string[]
): Promise<Vote> => {
  const voteRef = doc(collection(db, VOTES_COLLECTION));
  
  const vote: Vote = {
    id: voteRef.id,
    roomCode,
    title,
    dates,
    createdAt: new Date(),
    isActive: true,
  };

  await setDoc(voteRef, {
    ...vote,
    createdAt: vote.createdAt.toISOString(),
  });

  return vote;
};

// 방의 투표 목록 조회
export const getVotesByRoom = async (roomCode: string): Promise<Vote[]> => {
  const q = query(
    collection(db, VOTES_COLLECTION),
    where('roomCode', '==', roomCode)
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
    } as Vote;
  });
};

// 투표 응답 제출
export const submitVoteResponse = async (
  voteId: string,
  nickname: string,
  selectedDates: string[]
): Promise<VoteResponse> => {
  const responseRef = doc(collection(db, RESPONSES_COLLECTION));
  
  const response: VoteResponse = {
    id: responseRef.id,
    voteId,
    nickname,
    selectedDates,
    createdAt: new Date(),
  };

  await setDoc(responseRef, {
    ...response,
    createdAt: response.createdAt.toISOString(),
  });

  return response;
};

// 투표 응답 목록 조회
export const getVoteResponses = async (voteId: string): Promise<VoteResponse[]> => {
  const q = query(
    collection(db, RESPONSES_COLLECTION),
    where('voteId', '==', voteId)
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
    } as VoteResponse;
  });
};

// 투표 종료
export const closeVote = async (voteId: string): Promise<void> => {
  const voteRef = doc(db, VOTES_COLLECTION, voteId);
  await updateDoc(voteRef, { isActive: false });
};
