export const shareVoteToKakao = (
    roomName: string,
    voteTitle: string,
    roomCode: string
) => {
    if (typeof window === 'undefined' || !window.Kakao || !window.Kakao.isInitialized()) {
        alert('카카오톡 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }

    const isLocalhost = window.location.hostname === 'localhost';
    const baseUrl = isLocalhost ? 'http://192.168.219.102:3000' : window.location.origin;
    const shareUrl = `${baseUrl}?code=${roomCode}`;

    const templateId = parseInt(process.env.NEXT_PUBLIC_KAKAO_VOTE_TEMPLATE_ID || '0', 10);
    console.log('Shared Link -> ', shareUrl);

    try {
        window.Kakao.Share.sendCustom({
            templateId: templateId,
            templateArgs: {
                title: `${roomName}`,
                vote_title: voteTitle,
                room_code: roomCode,
                share_url: shareUrl,
            },
        });
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

  const isLocalhost = window.location.hostname === 'localhost';
  const baseUrl = isLocalhost ? 'http://192.168.219.102:3000' : window.location.origin;
  const shareUrl = `${baseUrl}?code=${roomCode}`;

  const templateId = parseInt(process.env.NEXT_PUBLIC_KAKAO_ROOM_TEMPLATE_ID || '0', 10);

  try {
    window.Kakao.Share.sendCustom({
      templateId: templateId,
      templateArgs: {
        title: roomName,
        room_code: roomCode,
        memo: memo || '',
        share_url: shareUrl,
      },
    });
  } catch (error) {
    console.error('카카오톡 공유 실패:', error);
    alert('카카오톡 공유에 실패했습니다.');
  }
};