import React, { FC, useMemo, memo } from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
//
import { ChatWrapper } from '@components/Chat/styles';
import dayjs from 'dayjs';
import gravatar from 'gravatar';
import regexifyString from 'regexify-string';
//
import { IChat, IDM, IUser } from '@typings/db';

const BACK_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3095' : 'https://sleact.nodebird.com';
//
interface Props {
  data: IDM | IChat;
}
//
const Chat: FC<Props> = memo(({ data }) => {
  console.log('Chat : ', data);
  const { workspace } = useParams<{ workspace: string; channel: string }>();
  const user: IUser = 'Sender' in data ? data.Sender : data.User;

  // @[test](1)
  // . : 글자
  // \d : 숫자
  // ? : 0개나 1개
  // + : 1개 이상
  // * : 0개 이상
  // | : 또는
  // \n : 줄바꿈
  // g : 모두 찾기
  // () : 그루핑 => arr[1], arr[2] , ... 에 추가
  const result = useMemo<(string | JSX.Element)[] | JSX.Element>(
    () =>
      data.content.startsWith('uploads\\') || data.content.startsWith('uploads/') ? (
        <img src={`${BACK_URL}/${data.content}`} style={{ maxHeight: 200 }} />
      ) : (
        // 정규 표현식
        regexifyString({
          input: data.content,
          pattern: /@\[(.+?)]\((\d+?)\)|\n/g,
          decorator(match, index) {
            const arr: string[] | null = match.match(/@\[(.+?)]\((\d+?)\)/)!;
            if (arr) {
              return (
                <Link key={match + index} to={`/workspace/${workspace}/dm/${arr[2]}`}>
                  @{arr[1]}
                </Link>
              );
            }
            // 줄바꿈
            return <br key={index} />;
          },
        })
      ),
    [workspace, data.content],
  );

  return (
    <ChatWrapper>
      <div className="chat-img">
        <img src={gravatar.url(user.email, { s: '36px', d: 'retro' })} alt={user.nickname} />
      </div>
      <div className="chat-text">
        <div className="chat-user">
          <b>{user.nickname}</b>
          <span>{dayjs(data.createdAt).format('h:mm A')}</span>
        </div>
        <p>{result}</p>
      </div>
    </ChatWrapper>
  );
});

export default Chat;
