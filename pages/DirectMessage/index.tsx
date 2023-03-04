import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
//
import ChatBox from '@components/ChatBox';
import ChatList from '@components/ChatList';
import { DragOver } from '@pages/Channel/styles';
import { Header, Container } from '@pages/DirectMessage/styles';
//
import useSocket from '@hooks/useSocket';
import useInput from '@hooks/useInput';
//
import { IDM } from '@typings/db';
//
import fetcher from '@utils/fetcher';
import makeSection from '@utils/makeSection';
//
import axios from 'axios';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import gravatar from 'gravatar';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { toast } from 'react-toastify';

const PAGE_SIZE = 20;

const DirectMessage = () => {
  const { workspace, id } = useParams<{ workspace: string; id: string }>();

  const [socket] = useSocket(workspace);

  const { data: myData } = useSWR('/api/users', fetcher);

  const { data: userData } = useSWR(`/api/workspaces/${workspace}/users/${id}`, fetcher);

  // reverse infinite scroll
  const scrollbarRef = useRef<Scrollbars>(null);

  const {
    data: chatData,
    mutate: mutateChat,
    setSize,
  } = useSWRInfinite<IDM[]>(
    (pageIndex) => `/api/workspaces/${workspace}/dms/${id}/chats?perPage=${PAGE_SIZE}&page=${pageIndex + 1}`,
    fetcher,
    {
      onSuccess(data) {
        // data : [Array(20), Array(1)]
        if (data?.length === 1) {
          setTimeout(() => {
            // 스크롤바 제일 아래로
            scrollbarRef.current?.scrollToBottom();
          }, 100);
        }
      },
    },
  );
  // data가 비어있는지 확인 => 마지막 페이지 확인
  const isEmpty = chatData?.[0]?.length === 0;
  // PAGE_SIZE 보다  적게 가지고 왔는지 확인 => 마지막 페이지 확인
  const isReachingEnd = isEmpty || (chatData && chatData[chatData.length - 1]?.length < PAGE_SIZE);
  //
  const chatSections = makeSection(chatData ? ([] as IDM[]).concat(...chatData).reverse() : []);
  //

  const [chat, onChangeChat, setChat] = useInput('');

  const [dragOver, setDragOver] = useState(false);

  // 내가 쓴 채팅
  const onSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      if (chat?.trim() && chatData) {
        //
        const savedChat = chat;

        // Optimistic UI
        mutateChat((prevChatData) => {
          // prevChatData : [Array(20), Array(1)]
          prevChatData?.[0].unshift({
            id: (chatData[0][0]?.id || 0) + 1,
            content: savedChat,
            SenderId: myData.id,
            Sender: myData,
            ReceiverId: userData.id,
            Receiver: userData,
            createdAt: new Date(),
          });

          return prevChatData;
        }, false).then(() => {
          //
          localStorage.setItem(`${workspace}-${id}`, new Date().getTime().toString());

          setChat('');

          if (scrollbarRef.current) {
            console.log('scrollToBottom!', scrollbarRef.current?.getValues());
            scrollbarRef.current.scrollToBottom();
          }
        });

        axios
          .post(`/api/workspaces/${workspace}/dms/${id}/chats`, {
            content: chat,
          })
          .catch(console.error);
      }
    },
    [chat, workspace, id, myData, userData, chatData, mutateChat, setChat],
  );

  // 남이 쓴 채팅
  const onMessage = useCallback(
    (data: IDM) => {
      // id는 상대방 아이디
      console.log('onMessage data : ', data);
      if (data.SenderId === Number(id) && myData.id !== Number(id)) {
        mutateChat((chatData) => {
          chatData?.[0].unshift(data);

          return chatData;
        }, false).then(() => {
          if (scrollbarRef.current) {
            // 남이 채팅을 칠때마다 스크롤이 내려가는 것 방지
            // => 내가 150px 이상으로 올렸을때는 남이 채팅을 처도 스크롤 방지
            // => 내가 150px 미만으로 올렸을때는 남이 채팅을 처도 스크롤 됨
            if (
              scrollbarRef.current.getScrollHeight() <
              scrollbarRef.current.getClientHeight() + scrollbarRef.current.getScrollTop() + 150
            ) {
              console.log('scrollToBottom!', scrollbarRef.current?.getValues());

              setTimeout(() => {
                scrollbarRef.current?.scrollToBottom();
              }, 100);
            } else {
              toast.success('새 메시지가 도착했습니다.', {
                onClick() {
                  scrollbarRef.current?.scrollToBottom();
                },
                closeOnClick: true,
              });
            }
          }
        });
      }
    },
    [id, myData, mutateChat],
  );

  // Drag & Drop image upload
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      console.log(e);

      const formData = new FormData();

      if (e.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (e.dataTransfer.items[i].kind === 'file') {
            const file = e.dataTransfer.items[i].getAsFile();

            console.log('... file[' + i + '].name = ' + file.name);

            formData.append('image', file);
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          console.log('... file[' + i + '].name = ' + e.dataTransfer.files[i].name);

          formData.append('image', e.dataTransfer.files[i]);
        }
      }
      axios.post(`/api/workspaces/${workspace}/dms/${id}/images`, formData).then(() => {
        setDragOver(false);
        localStorage.setItem(`${workspace}-${id}`, new Date().getTime().toString());
        mutateChat();
      });
    },
    [workspace, id, mutateChat],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    console.log('onDragOver', e);
    setDragOver(true);
  }, []);

  // soket
  useEffect(() => {
    socket?.on('dm', onMessage);
    // 앱 종료 시 등록한 이벤트 해제
    return () => {
      socket?.off('dm', onMessage);
    };
  }, [socket, onMessage]);

  // workspace-id 현재 시간 기록
  useEffect(() => {
    localStorage.setItem(`${workspace}-${id}`, new Date().getTime().toString());
  }, [workspace, id]);
  //
  if (!userData || !myData) {
    return null;
  }

  return (
    <Container onDrop={onDrop} onDragOver={onDragOver}>
      <Header>
        <img src={gravatar.url(userData.email, { s: '24px', d: 'retro' })} alt={userData.nickname} />
        <span>{userData.nickname}</span>
      </Header>
      <ChatList
        scrollbarRef={scrollbarRef}
        isReachingEnd={isReachingEnd}
        isEmpty={isEmpty}
        chatSections={chatSections}
        setSize={setSize}
      />
      <ChatBox
        onSubmitForm={onSubmitForm}
        chat={chat}
        onChangeChat={onChangeChat}
        placeholder={`Message ${userData.nickname}`}
        data={[]}
      />
      {dragOver && <DragOver>업로드!</DragOver>}
    </Container>
  );
};

export default DirectMessage;
