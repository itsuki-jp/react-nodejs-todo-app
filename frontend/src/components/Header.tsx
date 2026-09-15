import { LogIn, LogOut, UserPlus } from "lucide-react";

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
              <LogOut />
              <span>ログアウト</span>
            </button>
          </li>
        ) : (
          <>
            <li>
              <button type="button" onClick={onClickLogin}>
                <LogIn />
                <span>ログイン</span>
              </button>
            </li>
            <li>
              <button type="button" onClick={onClickRegister}>
                <UserPlus />
                <span>会員登録</span>
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  </header>
);
