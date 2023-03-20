import { useCallback } from 'react';
import io from 'socket.io-client';
// import { io, Socket } from 'socket.io-client';

const backUrl = process.env.NODE_ENV === 'production' ? 'https://sleact.nodebird.com' : 'http://localhost:3095';

// const sockets: { [key: string]: Socket } = {};
const sockets: { [key: string]: SocketIOClient.Socket } = {};

// io 객체 - 연결된 전체 클라이언트들과의 interacting을 위한 객체
// socket 객체 - 개별 클라이언트와의 interacting을 위한 객체

// Socket.IO는 전역적인 특징을 가짐
// 공통된 컴포넌트나 훅에 만들어 사용
const useSocket = (workspace?: string): [SocketIOClient.Socket | undefined, () => void] => {
  //
  const disconnect = useCallback(() => {
    if (workspace && sockets[workspace]) {
      sockets[workspace].disconnect();
      // delete 연산자는 객체의 속성을 제거
      delete sockets[workspace];
    }
  }, [workspace]);
  //
  if (!workspace) {
    return [undefined, disconnect];
  }
  //
  if (!sockets[workspace]) {
    //http연결을 요청(Polling) 하지않고 바로 websocket만 하용하도록 명시
    sockets[workspace] = io(`${backUrl}/ws-${workspace}`, {
      transports: ['websocket'],
    });

    console.info('create socket', workspace, sockets[workspace]);
  }
  //
  return [sockets[workspace], disconnect];
};

export default useSocket;

// socket = io.connect()
// socket emit()
// sockets.on()
// sockets.disconnect()
