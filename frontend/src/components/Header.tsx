type Props = {
  isLoggedIn: boolean;
  onClickLogout: () => void | Promise<void>;
  onClickLogin: () => void;
  onClickRegister: () => void;
};

export const Header = ({
  isLoggedIn,
  onClickLogout,
  onClickLogin,
  onClickRegister,
}: Props) => (
  <header>
    <nav>
      <h1>ToDoアプリ</h1>

      <ul>
        {isLoggedIn ? (
          <li>
            <button type="button" onClick={() => void onClickLogout()}>
              ログアウト
            </button>
          </li>
        ) : (
          <>
            <li>
              <button type="button" onClick={onClickLogin}>
                ログイン
              </button>
            </li>
            <li>
              <button type="button" onClick={onClickRegister}>
                会員登録
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  </header>
);
