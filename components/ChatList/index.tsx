import Chat from '@components/Chat';
import { ChatZone, Section, StickyHeader } from '@components/ChatList/styles';
import { IChat, IDM } from '@typings/db';
import React, { FC, RefObject, useCallback } from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';

interface Props {
  scrollbarRef: RefObject<Scrollbars>;
  isReachingEnd?: boolean;
  isEmpty: boolean;
  chatSections: { [key: string]: (IDM | IChat)[] };
  setSize: (f: (size: number) => number) => Promise<(IDM | IChat)[][] | undefined>;
}
const ChatList: FC<Props> = ({
  scrollbarRef,
  isReachingEnd,
  isEmpty,
  chatSections,
  setSize,
  //
}) => {
  // console.log('chatSections : ', chatSections);
  //
  // reverse infinite scroll
  const onScroll = useCallback(
    (values) => {
      // values.scrollTop === 0  => 가장 위
      if (values.scrollTop === 0 && !isReachingEnd && !isEmpty) {
        // 데이터 추가 로딩
        setSize((preSize) => preSize + 1).then(() => {
          // 스크롤 위치 유지
          // scrollbarRef.current?.getScrollHeight() : 총 scroll 할 수 있는 height
          // values.scrollHeight : 현재 values의 scroll된 height
          scrollbarRef.current?.scrollTop(scrollbarRef.current?.getScrollHeight() - values.scrollHeight);
        });
      }
    },
    [setSize, scrollbarRef, isReachingEnd, isEmpty],
  );
  //
  return (
    <ChatZone>
      <Scrollbars autoHide ref={scrollbarRef} onScrollFrame={onScroll}>
        {Object.entries(chatSections).map(([date, chats]) => {
          return (
            <Section className={`section-${date}`} key={date}>
              <StickyHeader>
                <button>{date}</button>
              </StickyHeader>
              {chats.map((chat) => (
                <Chat key={chat.id} data={chat} />
              ))}
            </Section>
          );
        })}
      </Scrollbars>
    </ChatZone>
  );
};

export default ChatList;
