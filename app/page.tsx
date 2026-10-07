"use client";
import { useRef } from "react";
import Link from "next/link";
import { Coffee, HelpCircle, LogOut, X } from "lucide-react";
import { Sandbox } from "./game/components/sandbox";
import { TilePreview } from "./game/components/tile-button";
import { GameRoom } from "./game/components/game-room";
import { LobbyHome } from "./lobby/components/lobby-home";
import { CreateLobbyDialog } from "./lobby/components/create-lobby-dialog";
import { RulesDialog } from "./shared/rules-dialog";
import { useGameRoom } from "./game/hooks/useGameRoom";
import { useTileDrag } from "./game/hooks/useTileDrag";

export default function Home() {
  const game = useGameRoom();
  const suppressClickRef = useRef(false);
  const drag = useTileDrag({
    room: game.room,
    board: game.board,
    rack: game.rack,
    selected: game.selected,
    interactive: game.interactive,
    loading: game.loading,
    sortMode: game.sortMode,
    suppressClickRef,
    setBoard: game.setBoard,
    setRack: game.setRack,
    setSelected: game.setSelected,
    setError: game.setError,
  });

  const dragPreview =
    drag.dragging.length > 0 &&
    drag.dragOffsets.map(({ id, x, y }) => {
      const fromRack = game.room?.rack.includes(id) ?? false;
      return (
        <TilePreview
          key={id}
          id={id}
          left={drag.dragPos.x + x}
          top={drag.dragPos.y + y}
          fromRack={fromRack}
          overTable={fromRack && drag.dragTarget !== "" && drag.dragTarget !== "rack"}
        />
      );
    });

  return (
    <main className="app">
      {drag.dragging.length > 0 && (
        <div className="drag-preview-layer" aria-hidden="true">
          {dragPreview}
        </div>
      )}
      <header className="topbar">
        <Link
          className="brand"
          href="/"
          onClick={(e) => {
            if (game.room) {
              e.preventDefault();
              game.setRules(true);
            }
          }}
        >
          <span className="brandmark">
            r<span>•</span>
          </span>
          <span>
            rummy club<small>ПЕРЕРЫВ НА ПАРТИЮ</small>
          </span>
        </Link>
        <div className="top-actions">
          <span className="quiet">
            <Coffee size={16} /> Без спешки
          </span>
          <button
            className="iconbtn"
            aria-label="Правила игры"
            onClick={() => game.setRules(true)}
          >
            <HelpCircle size={21} />
          </button>
          {game.room && (
            <button
              className="iconbtn"
              aria-label="Выйти из лобби"
              disabled={game.loading}
              onClick={() => {
                if (confirm("Выйти из лобби? Ваши фишки вернутся в банк."))
                  void game.act("leave");
              }}
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>
      {game.error && (
        <div className="message error" role="alert">
          <span>{game.error}</span>
          <button onClick={() => game.setError("")} aria-label="Закрыть ошибку">
            <X size={18} />
          </button>
        </div>
      )}
      {game.notice && (
        <div className="toast" role="status">
          {game.notice}
        </div>
      )}
      {game.restoring ? (
        <div className="loading-screen">Возвращаемся за стол…</div>
      ) : !game.room ? (
        <LobbyHome
          inviteCode={game.inviteCode}
          invite={game.invite}
          name={game.name}
          code={game.code}
          loading={game.loading}
          lobbies={game.lobbies}
          lobbiesError={game.lobbiesError}
          lobbiesLoading={game.lobbiesLoading}
          setName={game.setName}
          setCode={game.setCode}
          setCreateOpen={game.setCreateOpen}
          setRules={game.setRules}
          setListRefresh={game.setListRefresh}
          goHome={() => game.goHome()}
          act={game.act}
        />
      ) : (
        <GameRoom
          room={game.room}
          board={game.board}
          rack={game.rack}
          selected={game.selected}
          dragging={drag.dragging}
          dragTarget={drag.dragTarget}
          loading={game.loading}
          online={game.online}
          clock={game.clock}
          remaining={game.remaining}
          mine={game.mine}
          interactive={game.interactive}
          owner={game.owner}
          changed={game.changed}
          newPoints={game.newPoints}
          sortMode={game.sortMode}
          chatOpen={game.chatOpen}
          sandboxOpen={game.sandboxOpen}
          share={game.share}
          act={game.act}
          move={game.move}
          reset={game.reset}
          changeSort={game.changeSort}
          setSandboxOpen={(open) => {
            if (open) game.setSelected([]);
            game.setSandboxOpen(open);
          }}
          toggleChat={game.toggleChat}
          accept={(nextRoom) => {
            if (game.latest.current?.code === nextRoom.code) game.accept(nextRoom);
          }}
          choose={(id) => game.choose(id, suppressClickRef)}
          beginDrag={drag.beginDrag}
          updateDrag={drag.updateDrag}
          endDrag={drag.endDrag}
          finishDrag={drag.finishDrag}
        />
      )}
      {game.room && game.sandboxOpen && game.room.status === "playing" && (
        <Sandbox
          key={`${game.room.code}:${game.room.round}`}
          source={game.room}
          sort={game.sortMode}
          yourTurn={game.mine}
          onClose={() => game.setSandboxOpen(false)}
        />
      )}
      <CreateLobbyDialog
        open={game.createOpen}
        onOpenChange={game.setCreateOpen}
        name={game.name}
        error={game.error}
        loading={game.loading}
        openingRule={game.openingRule}
        setOpeningRule={game.setOpeningRule}
        turnSeconds={game.turnSeconds}
        setTurnSeconds={game.setTurnSeconds}
        randomMode={game.randomMode}
        setRandomMode={game.setRandomMode}
        botCount={game.botCount}
        setBotCount={game.setBotCount}
        replaceLeavers={game.replaceLeavers}
        setReplaceLeavers={game.setReplaceLeavers}
        isPublic={game.isPublic}
        setIsPublic={game.setIsPublic}
        onCreate={() =>
          void game.act("create", {
            isPublic: game.isPublic,
            openingRule: game.openingRule,
            turnSeconds: game.turnSeconds,
            botCount: game.botCount,
            replaceLeavers: game.replaceLeavers,
            randomMode: game.randomMode,
          })
        }
      />
      <footer>
        <span>rummy club / перерыв</span>
        <span>Одна хорошая партия — и снова в дело.</span>
        <span className="footer-links">
          <Link href="/privacy">Конфиденциальность</Link>
          <Link href="/terms">Условия</Link>
        </span>
      </footer>
      <RulesDialog open={game.rules} onClose={() => game.setRules(false)} />
    </main>
  );
}
