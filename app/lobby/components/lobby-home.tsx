"use client";

import { HelpCircle, Layers, Plus, RotateCcw, Users } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Lobby } from "../../game/types";
import { randomLabels, timeLabel } from "../../game/utils";
import { TileButton } from "../../game/components/tile-button";

type Props = {
  inviteCode: string;
  invite: Lobby | null;
  name: string;
  code: string;
  loading: boolean;
  lobbies: Lobby[];
  lobbiesError: string;
  lobbiesLoading: boolean;
  setName: (value: string) => void;
  setCode: (value: string) => void;
  setCreateOpen: (value: boolean) => void;
  setRules: (value: boolean) => void;
  setListRefresh: Dispatch<SetStateAction<number>>;
  goHome: () => void;
  act: (action: string, extra?: Record<string, unknown>) => Promise<unknown>;
};

export function LobbyHome(props: Props) {
  const {
    inviteCode,
    invite,
    name,
    code,
    loading,
    lobbies,
    lobbiesError,
    lobbiesLoading,
    setName,
    setCode,
    setCreateOpen,
    setRules,
    setListRefresh,
    goHome,
    act,
  } = props;
  return (
    <section className="entry home-entry">
      <div className="entry-table">
        <span className="eyebrow">ВАШ ОБЩИЙ СТОЛ</span>
        <h1>
          Коллеги рядом.
          <br />
          Работа подождёт.
        </h1>
        <p>
          Собирайте комбинации, перестраивайте стол
          <br className="desktop" /> и первым избавьтесь от всех фишек.
        </p>
        <div className="demo-tiles">
          {[7, 8, 9].map((id) => (
            <TileButton key={id} id={id} decor />
          ))}
          <span className="tile-gap" />
          {[24, 37, 50].map((id) => (
            <TileButton key={id} id={id} decor />
          ))}
        </div>
        <div className="entry-foot">
          <span>
            <Users size={17} /> 2–4 игрока
          </span>
          <span>
            <Layers size={17} /> 106 фишек
          </span>
          <span>Время на выбор</span>
        </div>
      </div>
      {inviteCode ? (
        <div className="home-pane invitation">
          <span className="invite-icon">
            <Users size={30} />
          </span>
          <span className="eyebrow">ПРИГЛАШЕНИЕ В ЛОББИ</span>
          <h2>
            {invite ? `За столом у ${invite.host}` : "Вход по приглашению"}
          </h2>
          <p className="invite-code">Лобби {inviteCode}</p>
          {invite && (
            <div className="invite-details">
              <span>
                {invite.playerCount}/4 участников
                {invite.botCount ? ` · ботов: ${invite.botCount}` : ""}
              </span>
              <span>{timeLabel(invite.turnSeconds ?? 0)}</span>
              <span>
                {invite.openingRule === "shared"
                  ? "Упрощённый старт"
                  : "30 очков у каждого"}
              </span>
              <span>
                {randomLabels[invite.randomMode ?? "classic"]} раздача
              </span>
            </div>
          )}
          {invite?.canJoin ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act("join", { code: inviteCode });
              }}
            >
              <label htmlFor="invite-name">Ваш ник</label>
              <input
                id="invite-name"
                autoFocus
                maxLength={20}
                placeholder="Как вас зовут?"
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                className="primary wide"
                disabled={loading || !name.trim()}
                type="submit"
              >
                Присоединиться к лобби
              </button>
            </form>
          ) : (
            <p className="list-note">
              {invite?.status === "lobby"
                ? "Все места заняты."
                : invite
                  ? "Партия уже началась."
                  : "Приглашение недоступно. Проверьте ссылку."}
            </p>
          )}
          <button className="textbtn" onClick={goHome}>
            Посмотреть другие лобби
          </button>
        </div>
      ) : (
        <div className="home-pane">
          <span className="eyebrow">СОБИРАЕМСЯ ЗА СТОЛОМ</span>
          <h2>С кем сыграем?</h2>
          <label htmlFor="name">Ваш ник</label>
          <input
            id="name"
            maxLength={20}
            placeholder="Например, Саша"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
          />
          <div className="home-actions">
            <button
              className="primary"
              disabled={loading || !name.trim()}
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={18} /> Создать лобби
            </button>
            <button className="textbtn" onClick={() => setRules(true)}>
              <HelpCircle size={17} /> Как играть
            </button>
          </div>
          <section className="lobby-list" aria-labelledby="lobby-list-title">
            <div className="lobby-list-heading">
              <div>
                <span className="eyebrow">ПРИСОЕДИНЯЙТЕСЬ</span>
                <h2 id="lobby-list-title">Открытые лобби</h2>
              </div>
              <button
                className="secondary compact"
                disabled={lobbiesLoading}
                onClick={() => setListRefresh((n) => n + 1)}
              >
                <RotateCcw size={15} /> Обновить
              </button>
            </div>
            {lobbiesError ? (
              <p role="alert" className="lobby-list-error">
                {lobbiesError}
              </p>
            ) : lobbiesLoading && !lobbies.length ? (
              <p className="list-note">Загружаем комнаты…</p>
            ) : !lobbies.length ? (
              <p className="list-note">
                Пока нет открытых комнат со свободными местами. Создайте лобби и
                пригласите коллег.
              </p>
            ) : (
              <div className="lobby-list-items">
                {lobbies.map((lobby) => (
                  <article className="lobby-list-item" key={lobby.code}>
                    <div>
                      <strong>{lobby.host}</strong>
                      <small>
                        {lobby.botCount ? `${lobby.botCount} бот. · ` : ""}
                        {randomLabels[lobby.randomMode ?? "classic"]} ·{" "}
                        {timeLabel(lobby.turnSeconds ?? 0)} ·{" "}
                        {lobby.openingRule === "shared"
                          ? "Упрощённый старт"
                          : "30 очков у каждого"}
                      </small>
                    </div>
                    <span className="lobby-seats">
                      <Users size={17} />
                      {lobby.playerCount}/4
                    </span>
                    <button
                      className="primary compact"
                      disabled={loading || !name.trim()}
                      onClick={() => act("join", { code: lobby.code })}
                    >
                      Войти
                    </button>
                  </article>
                ))}
              </div>
            )}
            {!name.trim() && lobbies.length > 0 && (
              <p className="list-note">
                Введите своё имя выше, чтобы присоединиться.
              </p>
            )}
          </section>
          <details className="join-by-code">
            <summary>Есть код лобби?</summary>
            <div className="join-row">
              <input
                aria-label="Код лобби"
                className="code-input"
                placeholder="ABCD2345"
                maxLength={8}
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""),
                  )
                }
              />
              <button
                className="secondary"
                disabled={loading || !name.trim() || code.length !== 8}
                onClick={() => act("join")}
              >
                Войти
              </button>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
