'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function KakaoSDKInitializer() {
    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 50; // 최대 5초 대기

        // SDK 로드를 기다리는 함수
        const initKakaoSDK = () => {
            if (typeof window !== 'undefined' && window.Kakao) {
                if (!window.Kakao.isInitialized()) {
                    const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
                    console.log('카카오 SDK 초기화 시작, App Key:', appKey);
                    
                    try {
                        window.Kakao.init(appKey);
                        console.log('✅ 카카오 SDK 초기화 완료:', window.Kakao.isInitialized());
                    } catch (error) {
                        console.error('❌ 카카오 SDK 초기화 실패:', error);
                    }
                } else {
                    console.log('✅ 카카오 SDK 이미 초기화됨');
                }
            } else {
                retryCount++;
                if (retryCount < maxRetries) {
                    // SDK가 아직 로드되지 않았으면 100ms 후 재시도
                    setTimeout(initKakaoSDK, 100);
                } else {
                    console.error('❌ 카카오 SDK 로드 실패: 타임아웃');
                }
            }
        };

        initKakaoSDK();
    }, []);

    return null;
}
