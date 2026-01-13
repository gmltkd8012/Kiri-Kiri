'use client'

import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const testConnection = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'test'));
        console.log('Firestore connection successful:', snapshot);
      } catch (error) {
        console.error('Error connecting to Firestore:', error);
      }
    };
    testConnection();
  }, []);

  return <div>Kiri-Kiri</div>;
}