import { useCallback } from 'react';
import io from 'socket.io-client';
// import { io, Socket } from 'socket.io-client';

const backUrl = process.env.NODE_ENV === 'production' ? 'https://sleact.nodebird.com' : 'http://localhost:3095';

// const sockets: { [key: string]: Socket } = {};
const sockets: { [key: string]: SocketIOClient.Socket } = {};

// Socket.IO는 전역적인 특징을 가짐
// 공통된 컴포넌트나 훅에 만들어 사용
const useSocket = (workspace?: string): [SocketIOClient.Socket | undefined, () => void] => {
  //
  const disconnect = useCallback(() => {
    if (workspace && sockets[workspace]) {
      sockets[workspace].disconnect();
      delete sockets[workspace];
    }
  }, [workspace]);
  //
  if (!workspace) {
    return [undefined, disconnect];
  }
  //
  if (!sockets[workspace]) {
    // Polling하지 말고, websocket만 쓸 것
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
