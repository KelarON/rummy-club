"use client";
import type { OpeningRule, RandomMode } from "../../../lib/game";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { timeLabel } from "../../game/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  error: string;
  loading: boolean;
  openingRule: OpeningRule;
  setOpeningRule: (v: OpeningRule) => void;
  turnSeconds: number;
  setTurnSeconds: (v: number) => void;
  randomMode: RandomMode;
  setRandomMode: (v: RandomMode) => void;
  botCount: number;
  setBotCount: (v: number) => void;
  replaceLeavers: boolean;
  setReplaceLeavers: (v: boolean) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  onCreate: () => void;
};
export function CreateLobbyDialog(p: Props) {
  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="create-dialog">
        <DialogTitle>Создать лобби</DialogTitle>
        <DialogDescription className="setting-help">
          Играете как {p.name}. Выберите правила для вашей компании.
        </DialogDescription>
        <div className="create-settings">
          <label htmlFor="opening-rule">Первый выход</label>
          <Select
            value={p.openingRule}
            onValueChange={(v) => p.setOpeningRule(v as OpeningRule)}
          >
            <SelectTrigger id="opening-rule" className="rule-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rule-options">
              <SelectItem value="shared">
                Упрощённый — один выход на всех
              </SelectItem>
              <SelectItem value="classic">
                Обычный — 30 очков у каждого
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="setting-help">
            {p.openingRule === "shared"
              ? "Порог 30 снимается для всех после первого выкладывания или круга без выкладываний."
              : "Каждый игрок должен самостоятельно выложить минимум 30 очков."}
          </p>
          <label htmlFor="turn-time">Время на ход</label>
          <Select
            value={String(p.turnSeconds)}
            onValueChange={(v) => p.setTurnSeconds(Number(v))}
          >
            <SelectTrigger id="turn-time" className="rule-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rule-options">
              {[0, 30, 60, 120, 180, 300].map((n) => (
                <SelectItem value={String(n)} key={n}>
                  {timeLabel(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="setting-help">
            {p.turnSeconds
              ? "Если время закончится, игрок возьмёт фишку и передаст ход. После 3 пропусков по таймеру игрок исключается из партии."
              : "Играйте в своём темпе. Если игрок не делает ход 30 минут, он исключается из партии."}
          </p>
          <label htmlFor="random-mode">Раздача фишек</label>
          <Select
            value={p.randomMode}
            onValueChange={(v) => p.setRandomMode(v as RandomMode)}
          >
            <SelectTrigger id="random-mode" className="rule-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rule-options">
              <SelectItem value="classic">
                Классическая — текущий случайный вариант
              </SelectItem>
              <SelectItem value="balanced">
                Сбалансированная — меньше дублей
              </SelectItem>
              <SelectItem value="easy">
                Лёгкая — проще собирать комбинации
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="setting-help">
            {p.randomMode === "classic"
              ? "Обычное случайное перемешивание всех 106 фишек."
              : p.randomMode === "balanced"
                ? "Меньше одинаковых фишек на старте; при взятии чаще приходят подходящие к руке."
                : "В стартовой руке есть выход на 30, при взятии чаще приходит полезная фишка."}
          </p>
          <label htmlFor="bot-count">Боты в комнате</label>
          <Select
            value={String(p.botCount)}
            onValueChange={(v) => p.setBotCount(Number(v))}
          >
            <SelectTrigger id="bot-count" className="rule-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rule-options">
              {[0, 1, 2, 3].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n === 0 ? "Без ботов" : `${n} ${n === 1 ? "бот" : "бота"}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="setting-help">
            Боты занимают места: всего в комнате до четырёх участников.
          </p>
          <div className="visibility-setting">
            <Checkbox
              id="replace-leavers"
              checked={p.replaceLeavers}
              onCheckedChange={(v) => p.setReplaceLeavers(v === true)}
            />
            <label htmlFor="replace-leavers">
              Заменять вышедших игроков ботами
            </label>
          </div>
          <p className="setting-help">
            {p.replaceLeavers
              ? "Бот продолжит партию с фишками вышедшего игрока. Когда уйдёт последний человек, лобби закроется."
              : "При выходе игрока фишки возвращаются в банк."}
          </p>
          <div className="visibility-setting">
            <Checkbox
              id="public-room"
              checked={p.isPublic}
              onCheckedChange={(v) => p.setIsPublic(v === true)}
            />
            <label htmlFor="public-room">Открытое лобби</label>
          </div>
          <p className="setting-help">
            {p.isPublic
              ? "Появится в общем списке. Любой сможет присоединиться."
              : "Вход только по ссылке или коду."}
          </p>
        </div>
        {p.error && (
          <p className="lobby-list-error" role="alert">
            {p.error}
          </p>
        )}
        <button
          className="primary wide"
          disabled={p.loading || !p.name.trim()}
          onClick={p.onCreate}
        >
          {p.loading ? "Создаём…" : "Создать лобби"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
