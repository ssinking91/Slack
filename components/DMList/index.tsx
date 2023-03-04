import React, { FC, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
//
import EachDM from '@components/EachDM';
import useSocket from '@hooks/useSocket';
import { CollapseButton } from '@components/DMList/styles';
import fetcher from '@utils/fetcher';
import useSWR from 'swr';
import { IDM, IUser, IUserWithOnline } from '@typings/db';

const DMList = () => {
  const { workspace } = useParams<{ workspace?: string }>();
  //
  const { data: userData } = useSWR<IUser>('/api/users', fetcher);
  //
  const { data: memberData } = useSWR<IUserWithOnline[]>(
    userData ? `/api/workspaces/${workspace}/members` : null,
    fetcher,
  );

  const [socket] = useSocket(workspace);

  const [channelCollapse, setChannelCollapse] = useState(false);
  const [onlineList, setOnlineList] = useState<number[]>([]);

  const toggleChannelCollapse = useCallback(() => {
    setChannelCollapse((prev) => !prev);
  }, []);

  useEffect(() => {
    console.log('DMList workspace : ', workspace);
    setOnlineList([]);
  }, [workspace]);

  useEffect(() => {
    console.info('DmList socket : ', socket);

    socket?.on('onlineList', (data: number[]) => {
      console.log('onlineList : ', data);
      setOnlineList(data);
    });

    // console.log('socket on dm', socket?.hasListeners('dm'), socket);

    // 앱 종료 시 등록한 이벤트 해제
    return () => {
      // console.log('socket off dm', socket?.hasListeners('dm'));
      socket?.off('onlineList');
    };
  }, [socket]);

  return (
    <>
      <h2>
        <CollapseButton collapse={channelCollapse} onClick={toggleChannelCollapse}>
          <i
            className="c-icon p-channel_sidebar__section_heading_expand p-channel_sidebar__section_heading_expand--show_more_feature c-icon--caret-right c-icon--inherit c-icon--inline"
            data-qa="channel-section-collapse"
            aria-hidden="true"
          />
        </CollapseButton>
        <span>Direct Messages</span>
      </h2>
      <div>
        {!channelCollapse &&
          memberData?.map((member) => {
            const isOnline = onlineList.includes(member.id);
            return <EachDM key={member.id} member={member} isOnline={isOnline} />;
          })}
      </div>
    </>
  );
};

export default DMList;
