export const shareVoteToKakao = (
    roomName: string,
    voteTitle: string,
    roomCode: string
) => {
    if (typeof window === 'undefined' || !window.Kakao || !window.Kakao.isInitialized()) {
        alert('카카오톡 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }

    // 개발 환경에서는 네트워크 IP 사용 (localhost는 카카오톡에서 버튼 표시 안 됨)
    const isLocalhost = window.location.hostname === 'localhost';
    const shareUrl = isLocalhost
        ? `http://192.168.219.102:3000/room/${roomCode}`
        : `${window.location.origin}/room/${roomCode}`;

    console.log('=== 카카오톡 공유 디버깅 ===');
    console.log('방 이름:', roomName);
    console.log('투표 제목:', voteTitle);
    console.log('방 코드:', roomCode);
    console.log('공유 URL:', shareUrl);
    console.log('카카오 SDK 초기화 상태:', window.Kakao.isInitialized());

    try {
        // 모바일 환경 체크
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        console.log('모바일 환경:', isMobile);

        if (isMobile) {
            // 모바일: 카카오톡 앱으로 직접 이동
            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: `📊 [${roomName}] 새 투표가 생성되었습니다`,
                    description: `${voteTitle}\n투표에 참여해주세요! (24시간 후 자동 마감)`,
                    imageUrl: 'https://via.placeholder.com/300x200?text=끼리끼리',
                    link: {
                        mobileWebUrl: shareUrl,
                        webUrl: shareUrl,
                    },
                },
                buttons: [
                    {
                        title: '투표하러 가기',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl,
                        },
                    },
                ],
                installTalk: true, // 카카오톡 미설치 시 설치 페이지로 이동
            });
        } else {
            // 데스크톱: 웹 공유 UI (SDK 정책상 앱 직접 실행 불가)
            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: `📊 [${roomName}] 새 투표가 생성되었습니다`,
                    description: `${voteTitle}\n\n투표 링크: ${shareUrl}\n\n투표에 참여해주세요! (24시간 후 자동 마감)`,
                    imageUrl: 'https://via.placeholder.com/300x200?text=끼리끼리',
                    link: {
                        mobileWebUrl: shareUrl,
                        webUrl: shareUrl,
                    },
                },
                buttons: [
                    {
                        title: '투표하러 가기',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl,
                        },
                    },
                ],
            });
        }
    } catch (error) {
        console.error('카카오톡 공유 실패:', error);
        alert('카카오톡 공유에 실패했습니다.');
    }
};


export const shareRoomToKakao = (
    roomName: string,
    roomCode: string,
    memo?: string
) => {
  if (typeof window === 'undefined' || !window.Kakao || !window.Kakao.isInitialized()) {
    alert('카카오톡 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    return;
  }

  // 개발 환경에서는 네트워크 IP 사용 (localhost는 카카오톡에서 버튼 표시 안 됨)
  const isLocalhost = window.location.hostname === 'localhost';
  const shareUrl = isLocalhost
      ? `http://192.168.219.102:3000/room/${roomCode}`
      : `${window.location.origin}/room/${roomCode}`;

  try {
    // 모바일 환경 체크
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `🎉 ${roomName} 방에 초대합니다!`,
        description: `초대코드: ${roomCode}`,
        imageUrl: 'https://via.placeholder.com/300x200?text=끼리끼리',
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: '방 입장하기',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
      ...(isMobile && { installTalk: true }), // 모바일에서 카카오톡 미설치 시 설치 페이지로 이동
    });
  } catch (error) {
    console.error('카카오톡 공유 실패:', error);
    alert('카카오톡 공유에 실패했습니다.');
  }
};