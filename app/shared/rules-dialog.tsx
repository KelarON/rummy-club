"use client";
import { X } from "lucide-react";

export function RulesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close iconbtn"
          aria-label="Закрыть правила"
          onClick={onClose}
          autoFocus
        >
          <X />
        </button>
        <span className="eyebrow">ПРАВИЛА ЗА МИНУТУ</span>
        <h2 id="rules-title">Как играть в Rummy Клуб</h2>
        <ol>
          <li>
            <strong>Избавьтесь от фишек.</strong> У каждого по 14 фишек. Кто
            первым выложит все — победил.
          </li>
          <li>
            <strong>Собирайте комбинации.</strong> Ряд: от 3 последовательных
            чисел одного цвета, например{" "}
            <span className="color-0">8</span>-
            <span className="color-0">9</span>-
            <span className="color-0">10</span>. Группа: 3 или 4 одинаковых
            числа разных цветов, например{" "}
            <span className="color-1">12</span>-
            <span className="color-2">12</span>-
            <span className="color-0">12</span>. Джокер {" "}(
            <span className="color-4">✦</span>) заменяет любую
            фишку.
          </li>
          <li>
            <strong>Правило первого хода.</strong> В обычном режиме каждый
            выкладывает от 30 очков только из своих фишек. В упрощённом режиме
            первый успешный выход от 30 снимает порог для всех. Если до этого
            все по очереди взяли фишку без выкладывания, порог тоже снимается.
            После этого все могут дополнять и перестраивать стол.
          </li>
          <li>
            <strong>Можно перестраивать стол.</strong> Выбирайте фишки, затем
            «Новая комбинация» или + у существующей. Все комбинации в конце хода
            должны быть правильными; нужно добавить хотя бы одну свою фишку.
            Чужие фишки со стола на подставку забирать нельзя.
          </li>
          <li>
            <strong>Нет хода? Возьмите фишку.</strong> Ход перейдёт следующему
            игроку. Чтобы взять фишку после перестановок, сначала нажмите
            «Отменить».
          </li>
        </ol>

        <div className="house-rules">
          <strong>Дополнительно</strong>
          <ul>
            <li>
              <strong>Игра на время.</strong> Задаётся в лобби, по умолчанию —
              без ограничения. Просрочил — берёшь одну фишку, перестановки
              отменяются.
            </li>
            <li>
              <strong>Исключение неактивных игроков.</strong> Три пропуска хода
              по времени или 30 минут без хода в игре без таймера — игрок
              покидает игру.
            </li>
            <li>
              <strong>Черновик.</strong> Собирай комбинации на локальной копии
              стола даже в чужой ход. Чтобы сделать настоящий ход — повтори его
              отдельно.
            </li>
            <li>
              <strong>Если банк пуст.</strong> Когда все пропустили, побеждает
              игрок с минимумом очков на руках. Джокер считается за 30.
            </li>
          </ul>
        </div>

        <button className="primary wide" onClick={onClose}>
          Всё понятно
        </button>
      </section>
    </div>
  );
}