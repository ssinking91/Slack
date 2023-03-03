import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { useParams } from 'react-router';
//
import ChatBox from '@components/ChatBox';
import ChatList from '@components/ChatList';
import InviteChannelModal from '@components/InviteChannelModal';
import { Header, Container, DragOver } from '@pages/Channel/styles';
//
import useInput from '@hooks/useInput';
import useSocket from '@hooks/useSocket';
//
import { IChannel, IChat, IUser } from '@typings/db';
//
import axios from 'axios';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import fetcher from '@utils/fetcher';
import makeSection from '@utils/makeSection';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { toast, ToastContainer } from 'react-toastify';

const PAGE_SIZE = 20;

const Channel = () => {
  const { workspace, channel } = useParams<{ workspace: string; channel: string }>();

  const [socket] = useSocket(workspace);

  const { data: userData } = useSWR<IUser>('/api/users', fetcher);

  const { data: channelsData } = useSWR<IChannel[]>(`/api/workspaces/${workspace}/channels`, fetcher);

  const channelData = channelsData?.find((v) => v.name === channel);

  const { data: channelMembersData } = useSWR<IUser[]>(
    userData ? `/api/workspaces/${workspace}/channels/${channel}/members` : null,
    fetcher,
  );

  // reverse infinite scroll
  const scrollbarRef = useRef<Scrollbars>(null);

  const {
    data: chatData,
    mutate: mutateChat,
    setSize,
  } = useSWRInfinite<IChat[]>(
    (index) => `/api/workspaces/${workspace}/channels/${channel}/chats?perPage=${PAGE_SIZE}&page=${index + 1}`,
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
  // PAGE_SIZE 보다 적게 가지고 왔는지 확인 => 마지막 페이지 확인
  const isReachingEnd = isEmpty || (chatData && chatData[chatData.length - 1]?.length < PAGE_SIZE);
  //
  const chatSections = makeSection(chatData ? ([] as IChat[]).concat(...chatData).reverse() : []);

  const [chat, onChangeChat, setChat] = useInput('');

  const [showInviteChannelModal, setShowInviteChannelModal] = useState(false);

  const [dragOver, setDragOver] = useState(false);

  const onCloseModal = useCallback(() => {
    setShowInviteChannelModal(false);
  }, []);

  const onSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      if (chat?.trim() && chatData && channelData && userData) {
        const savedChat = chat;

        // Optimistic UI
        mutateChat((prevChatData) => {
          // prevChatData : [Array(20), Array(1)]
          prevChatData?.[0].unshift({
            id: (chatData[0][0]?.id || 0) + 1,
            content: savedChat,
            UserId: userData.id,
            User: userData,
            createdAt: new Date(),
            ChannelId: channelData.id,
            Channel: channelData,
          });
          return prevChatData;
        }, false).then(() => {
          localStorage.setItem(`${workspace}-${channel}`, new Date().getTime().toString());

          setChat('');

          if (scrollbarRef.current) {
            console.log('scrollToBottom!', scrollbarRef.current?.getValues());
            scrollbarRef.current.scrollToBottom();
          }
        });

        axios
          .post(`/api/workspaces/${workspace}/channels/${channel}/chats`, {
            content: savedChat,
          })
          .catch(console.error);
      }
    },
    [chat, workspace, channel, channelData, userData, chatData, mutateChat, setChat],
  );

  const onMessage = useCallback(
    (data: IChat) => {
      console.log('onMessage data : ', data);
      if (
        data.Channel.name === channel &&
        (data.content.startsWith('uploads\\') || data.content.startsWith('uploads/') || data.UserId !== userData?.id)
      ) {
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
    [channel, userData, mutateChat],
  );

  const onClickInviteChannel = useCallback(() => {
    setShowInviteChannelModal(true);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      console.log(e);
      const formData = new FormData();
      if (e.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          console.log(e.dataTransfer.items[i]);
          if (e.dataTransfer.items[i].kind === 'file') {
            const file = e.dataTransfer.items[i].getAsFile();
            console.log(e, '.... file[' + i + '].name = ' + file.name);
            formData.append('image', file);
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          console.log(e, '... file[' + i + '].name = ' + e.dataTransfer.files[i].name);
          formData.append('image', e.dataTransfer.files[i]);
        }
      }
      axios.post(`/api/workspaces/${workspace}/channels/${channel}/images`, formData).then(() => {
        setDragOver(false);
        localStorage.setItem(`${workspace}-${channel}`, new Date().getTime().toString());
      });
    },
    [workspace, channel],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    console.log(e);
    setDragOver(true);
  }, []);

  // soket
  useEffect(() => {
    socket?.on('message', onMessage);
    // 앱 종료 시 등록한 이벤트 해제
    return () => {
      socket?.off('message', onMessage);
    };
  }, [socket, onMessage]);

  useEffect(() => {
    localStorage.setItem(`${workspace}-${channel}`, new Date().getTime().toString());
  }, [workspace, channel]);

  if (channelsData && !channelData) {
    return <Redirect to={`/workspace/${workspace}/channel/일반`} />;
  }

  return (
    <Container onDrop={onDrop} onDragOver={onDragOver}>
      <Header>
        <span>#{channel}</span>
        <div className="header-right">
          <span>{channelMembersData?.length}</span>
          <button
            onClick={onClickInviteChannel}
            className="c-button-unstyled p-ia__view_header__button"
            aria-label="Add people to #react-native"
            data-sk="tooltip_parent"
            type="button"
          >
            <i className="c-icon p-ia__view_header__button_icon c-icon--add-user" aria-hidden="true" />
          </button>
        </div>
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
        placeholder={`Message #${channel}`}
        data={channelMembersData}
      />
      <InviteChannelModal
        show={showInviteChannelModal}
        onCloseModal={onCloseModal}
        setShowInviteChannelModal={setShowInviteChannelModal}
      />
      <ToastContainer position="bottom-center" />
      {dragOver && <DragOver>업로드!</DragOver>}
    </Container>
  );
};

export default Channel;
