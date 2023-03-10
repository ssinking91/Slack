import React, { useCallback, useState } from 'react';
import { Redirect, Link } from 'react-router-dom';
//
import { Button, Error, Form, Header, Input, Label, LinkContainer, Success } from '@pages/SignUp/styles';
//
import useInput from '@hooks/useInput';
import fetcher from '@utils/fetcher';
//
import axios from 'axios';
import useSWR from 'swr';
//
const SignUp = () => {
  const { data: userData } = useSWR('/api/users', fetcher);

  const [email, onChangeEmail] = useInput('test@naver.com');
  const [nickname, onChangeNickname] = useInput('test');
  const [password, , setPassword] = useInput('test00!!');
  const [passwordCheck, , setPasswordCheck] = useInput('');

  const [signUpError, setSignUpError] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [mismatchError, setMismatchError] = useState(false);

  const onChangePassword = useCallback(
    (e) => {
      setPassword(e.target.value);
      setMismatchError(passwordCheck !== e.target.value);
    },
    [passwordCheck, setPassword],
  );

  const onChangePasswordCheck = useCallback(
    (e) => {
      setPasswordCheck(e.target.value);
      setMismatchError(password !== e.target.value);
    },
    [password, setPasswordCheck],
  );

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!nickname || !nickname.trim()) {
        return;
      }
      if (!mismatchError) {
        setSignUpError(false);
        setSignUpSuccess(false);
        // const baseUrl = `http://localhost:3095`;
        axios
          .post('/api/users', { email, nickname, password })
          .then((res) => {
            console.log(res);
            setSignUpSuccess(true);
          })
          .catch((error) => {
            console.log(error.response?.data);
            setSignUpError(error.response?.status === 403);
          });
      }
    },
    [email, nickname, password, mismatchError],
  );

  if (userData) {
    return <Redirect to="/workspace/sleact" />;
  }

  return (
    <div id="container">
      <Header>Slack</Header>
      <Form onSubmit={onSubmit}>
        <Label id="email-label">
          <span>????????? ??????</span>
          <div>
            <Input type="email" id="email" name="email" value={email} onChange={onChangeEmail} />
          </div>
        </Label>
        <Label id="nickname-label">
          <span>?????????</span>
          <div>
            <Input type="text" id="nickname" name="nickname" value={nickname} onChange={onChangeNickname} />
          </div>
        </Label>
        <Label id="password-label">
          <span>????????????</span>
          <div>
            <Input type="password" id="password" name="password" value={password} onChange={onChangePassword} />
          </div>
        </Label>
        <Label id="password-check-label">
          <span>???????????? ??????</span>
          <div>
            <Input
              type="password"
              id="password-check"
              name="password-check"
              value={passwordCheck}
              onChange={onChangePasswordCheck}
            />
          </div>
          {mismatchError && <Error>??????????????? ???????????? ????????????.</Error>}
          {!nickname && <Error>???????????? ??????????????????.</Error>}
          {signUpError && <Error>?????? ????????? ??????????????????.</Error>}
          {signUpSuccess && <Success>???????????????????????????! ?????????????????????.</Success>}
        </Label>
        <Button type="submit">????????????</Button>
      </Form>
      <LinkContainer>
        ?????? ???????????????????&nbsp;
        <Link to="/login">????????? ????????????</Link>
      </LinkContainer>
    </div>
  );
};

export default SignUp;
