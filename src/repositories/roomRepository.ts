import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { Room } from '@/models/types';
import { addParticipant } from './participantRepository';  // 추가

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
