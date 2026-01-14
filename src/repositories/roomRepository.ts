import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { Room } from '@/models/types';
import { addParticipant } from './participantRepository';

const COLLECTION_NAME = 'rooms';
const MAX_RETRY = 5;

const generateCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const isCodeExists = async (code: string): Promise<boolean> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('code', '==', code)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

const generateUniqueCode = async (): Promise<string> => {
  let code = generateCode();
  let retry = 0;

  while (await isCodeExists(code)) {
    if (retry >= MAX_RETRY) {
      throw new Error('코드 생성 실패. 다시 시도해주세요.');
    }
    code = generateCode();
    retry++;
  }

  return code;
};

// 방 생성 (방장을 참가자로 자동 추가)
export const createRoom = async (
  title: string,
  hostNickname: string,
  memo?: string
): Promise<Room> => {
  const code = await generateUniqueCode();
  const roomRef = doc(collection(db, COLLECTION_NAME));
  
  const room: Room = {
    id: roomRef.id,
    code,
    title,
    hostNickname,
    createdAt: new Date(),
    ...(memo && { memo }),
  };

  await setDoc(roomRef, {
    ...room,
    createdAt: room.createdAt.toISOString(),
  });

  // 방장을 참가자로 자동 추가
  await addParticipant(code, hostNickname);

  return room;
};

// 코드로 방 조회
export const getRoomByCode = async (code: string): Promise<Room | null> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('code', '==', code.toUpperCase())
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  } as Room;
};

// 방 삭제 (관련된 모든 데이터 CASCADE 삭제)
export const deleteRoom = async (roomCode: string): Promise<void> => {
  const batch = writeBatch(db);

  // 1. 방의 모든 투표 조회
  const votesQuery = query(
    collection(db, 'votes'),
    where('roomCode', '==', roomCode)
  );
  const votesSnapshot = await getDocs(votesQuery);

  // 2. 각 투표의 모든 응답 삭제
  for (const voteDoc of votesSnapshot.docs) {
    const voteId = voteDoc.id;

    // 투표 응답 조회
    const responsesQuery = query(
      collection(db, 'voteResponses'),
      where('voteId', '==', voteId)
    );
    const responsesSnapshot = await getDocs(responsesQuery);

    // 응답 삭제
    responsesSnapshot.docs.forEach(responseDoc => {
      batch.delete(responseDoc.ref);
    });

    // 투표 삭제
    batch.delete(voteDoc.ref);
  }

  // 3. 모든 참여자 삭제
  const participantsQuery = query(
    collection(db, 'participants'),
    where('roomCode', '==', roomCode)
  );
  const participantsSnapshot = await getDocs(participantsQuery);

  participantsSnapshot.docs.forEach(participantDoc => {
    batch.delete(participantDoc.ref);
  });

  // 4. 방 삭제
  const roomQuery = query(
    collection(db, COLLECTION_NAME),
    where('code', '==', roomCode)
  );
  const roomSnapshot = await getDocs(roomQuery);

  if (!roomSnapshot.empty) {
    batch.delete(roomSnapshot.docs[0].ref);
  }

  // 일괄 삭제 실행
  await batch.commit();
};
