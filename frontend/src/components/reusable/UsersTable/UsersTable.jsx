import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '../../ui/Avatar/Avatar.jsx';
import Badge from '../../ui/Badge/Badge.jsx';
import useBreakpoint from '../../../composables/useBreakpoint.js';
import {
  IconAt,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCalendar,
} from '../../icons/Icons.jsx';
import './UsersTable.css';

const DEFAULT_PAGE_SIZE = 7;

const UsersTable = ({
  users,
  selectedUserId,
  onSelectUser,
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { isMobileOrTablet } = useBreakpoint();
  const tableTopRef = useRef(null);
  const shouldScrollRef = useRef(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(users.length / pageSize)),
    [users.length, pageSize],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (!shouldScrollRef.current) return;
    shouldScrollRef.current = false;
    const id = requestAnimationFrame(() => {
      const el = tableTopRef.current;
      if (!el) return;
      const scroller = el.closest('.app-page__content') || document.scrollingElement;
      if (!scroller) return;
      const elRect = el.getBoundingClientRect();
      const scrollerRect =
        scroller === document.scrollingElement
          ? { top: 0 }
          : scroller.getBoundingClientRect();
      const offset = 16;
      const target = scroller.scrollTop + (elRect.top - scrollerRect.top) - offset;
      scroller.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [currentPage]);

  const startIdx = (currentPage - 1) * pageSize;
  const visibleUsers = users.slice(startIdx, startIdx + pageSize);
  const emptyRowsCount = Math.max(0, pageSize - visibleUsers.length);

  const goPrev = () => {
    if (currentPage === 1) return;
    shouldScrollRef.current = true;
    setCurrentPage((p) => Math.max(1, p - 1));
  };
  const goNext = () => {
    if (currentPage === totalPages) return;
    shouldScrollRef.current = true;
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const renderDesktopTable = () => (
    <div className="users-table">
      <table className="users-table__el">
        <thead>
          <tr className="users-table__head">
            <th>Usuario</th>
            <th>Nombre de usuario</th>
            <th>Último acceso</th>
            <th>Estado</th>
            <th>Alta</th>
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map((user) => (
            <tr
              key={user.id}
              className={`users-table__row ${selectedUserId === user.id ? 'users-table__row--selected' : ''}`}
              onClick={() => onSelectUser?.(user)}
            >
              <td className="users-table__cell">
                <div className="users-table__user">
                  <Avatar src={user.avatar} size="medium" />
                  <div>
                    <div className="users-table__user-name">
                      {user.name}
                      {user.isCurrentUser && <span className="users-table__you">Yo</span>}
                    </div>
                    <div className="users-table__user-role">{user.role}</div>
                  </div>
                </div>
              </td>
              <td className="users-table__cell">
                <div className="users-table__username">
                  <IconAt width={14} height={14} /> {user.username}
                </div>
              </td>
              <td className="users-table__cell">{user.lastAccess}</td>
              <td className="users-table__cell">
                <Badge variant={user.status === 'Activo' ? 'success' : 'danger'}>{user.status}</Badge>
              </td>
              <td className="users-table__cell">{user.createdDate}</td>
            </tr>
          ))}
          {Array.from({ length: emptyRowsCount }).map((_, i) => (
            <tr key={`empty-${i}`} className="users-table__row users-table__row--empty" aria-hidden="true">
              <td className="users-table__cell" colSpan={5}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCards = () => (
    <div className="users-cards">
      {visibleUsers.map((user) => {
        const isSelected = selectedUserId === user.id;
        return (
          <button
            type="button"
            key={user.id}
            className={`users-card ${isSelected ? 'users-card--selected' : ''}`}
            onClick={() => onSelectUser?.(user)}
          >
            <div className="users-card__top">
              <Avatar src={user.avatar} size="medium" />
              <div className="users-card__identity">
                <div className="users-card__name">
                  {user.name}
                  {user.isCurrentUser && <span className="users-table__you">Yo</span>}
                </div>
                <div className="users-card__role">{user.role}</div>
              </div>
              <Badge variant={user.status === 'Activo' ? 'success' : 'danger'}>{user.status}</Badge>
            </div>
            <div className="users-card__meta">
              <div className="users-card__meta-item">
                <IconAt width={14} height={14} />
                <span>{user.username}</span>
              </div>
              <div className="users-card__meta-item">
                <IconClock width={14} height={14} />
                <span>{user.lastAccess}</span>
              </div>
              <div className="users-card__meta-item">
                <IconCalendar width={14} height={14} />
                <span>Alta: {user.createdDate}</span>
              </div>
            </div>
          </button>
        );
      })}
      {visibleUsers.length === 0 && (
        <div className="users-cards__empty">Sin usuarios en esta página</div>
      )}
    </div>
  );

  return (
    <>
      <div ref={tableTopRef}>
        {isMobileOrTablet ? renderCards() : renderDesktopTable()}
      </div>

      <div className="users-table__pagination">
        <span className="users-table__pagination-info">
          {visibleUsers.length === 0
            ? '0 resultados'
            : `${startIdx + 1}–${startIdx + visibleUsers.length} de ${users.length}`}
        </span>
        <div className="users-table__pagination-controls">
          <button
            type="button"
            className="users-table__pagination-btn"
            onClick={goPrev}
            disabled={currentPage === 1}
            aria-label="Página anterior"
          >
            <IconChevronLeft width={16} height={16} />
          </button>
          <span className="users-table__pagination-page">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="users-table__pagination-btn"
            onClick={goNext}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
          >
            <IconChevronRight width={16} height={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default UsersTable;
