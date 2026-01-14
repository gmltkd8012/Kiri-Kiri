import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
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

  const now = new Date();
  const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24시간 후

  const vote: Vote = {
    id: voteRef.id,
    roomCode,
    title,
    dates,
    createdAt: now,
    expireAt: expireAt,
    isActive: true,
  };

  await setDoc(voteRef, {
    ...vote,
    createdAt: vote.createdAt.toISOString(),
    expireAt: vote.expireAt.toISOString(),
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
      expireAt: new Date(data.expireAt),
    } as Vote;
  });
};

// 투표 응답 제출 (재투표 시 기존 데이터 업데이트)
export const submitVoteResponse = async (
  voteId: string,
  nickname: string,
  selectedDates: string[]
): Promise<VoteResponse> => {
  // 기존 투표 응답 확인
  const q = query(
    collection(db, RESPONSES_COLLECTION),
    where('voteId', '==', voteId),
    where('nickname', '==', nickname)
  );

  const snapshot = await getDocs(q);

  let responseRef;
  let responseId;

  if (!snapshot.empty) {
    // 기존 투표가 있으면 업데이트
    const existingDoc = snapshot.docs[0];
    responseRef = existingDoc.ref;
    responseId = existingDoc.id;

    await updateDoc(responseRef, {
      selectedDates,
      createdAt: new Date().toISOString(),
    });
  } else {
    // 새로운 투표 생성
    responseRef = doc(collection(db, RESPONSES_COLLECTION));
    responseId = responseRef.id;

    await setDoc(responseRef, {
      voteId,
      nickname,
      selectedDates,
      createdAt: new Date().toISOString(),
    });
  }

  const response: VoteResponse = {
    id: responseId,
    voteId,
    nickname,
    selectedDates,
    createdAt: new Date(),
  };

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

// Vote ID 의 투표자 조회
export const getVoteParticipants = async (voteId: string): Promise<string[]> => {
  const responses = await getVoteResponses(voteId);
  return responses.map(response => response.nickname);
}

// 투표 종료
export const closeVote = async (voteId: string): Promise<void> => {
  const voteRef = doc(db, VOTES_COLLECTION, voteId);
  await updateDoc(voteRef, { isActive: false });
};

// 만료된 투표를 확인하고 자동으로 종료
export const checkAndExpireVotes = async (roomCode: string): Promise<void> => {
  const votes = await getVotesByRoom(roomCode);
  const now = new Date();

  const expirePromises = votes
    .filter((vote) => vote.isActive && vote.expireAt <= now)
    .map((vote) => closeVote(vote.id));

  await Promise.all(expirePromises);
};

// 투표 삭제 (관련된 모든 응답 CASCADE 삭제)
export const deleteVote = async (voteId: string): Promise<void> => {
  const batch = writeBatch(db);

  // 1. 투표의 모든 응답 조회 및 삭제
  const responsesQuery = query(
    collection(db, RESPONSES_COLLECTION),
    where('voteId', '==', voteId)
  );
  const responsesSnapshot = await getDocs(responsesQuery);

  responsesSnapshot.docs.forEach(responseDoc => {
    batch.delete(responseDoc.ref);
  });

  // 2. 투표 삭제
  const voteRef = doc(db, VOTES_COLLECTION, voteId);
  batch.delete(voteRef);

  // 일괄 삭제 실행
  await batch.commit();
};
