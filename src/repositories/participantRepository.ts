import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { Participant } from '@/models/types';

const COLLECTION_NAME = 'participants';

// 참가자 추가
export const addParticipant = async (
  roomCode: string,
  nickname: string
): Promise<Participant> => {
  // 이미 참가한 닉네임인지 체크
  const existing = await getParticipantByNickname(roomCode, nickname);
  
  if (existing) return existing;

  const participantRef = doc(collection(db, COLLECTION_NAME));
  
  const participant: Participant = {
    id: participantRef.id,
    roomCode,
    nickname,
    joinedAt: new Date(),
  };

  await setDoc(participantRef, {
    ...participant,
    joinedAt: participant.joinedAt.toISOString(),
  });

  return participant;
};

// 방의 참가자 목록 조회
export const getParticipantsByRoom = async (roomCode: string): Promise<Participant[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('roomCode', '==', roomCode)
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      joinedAt: new Date(data.joinedAt),
    } as Participant;
  });
};

// 닉네임으로 참가자 조회
export const getParticipantByNickname = async (
  roomCode: string,
  nickname: string
): Promise<Participant | null> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('roomCode', '==', roomCode),
    where('nickname', '==', nickname)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data();
  return {
    ...data,
    joinedAt: new Date(data.joinedAt),
  } as Participant;
};
