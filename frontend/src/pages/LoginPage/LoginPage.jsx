import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconMicroscope, IconUser, IconLock, IconArrowLeft } from '../../components/icons/Icons.jsx';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username && password) {
      sessionStorage.setItem('rsbo_auth', 'true');
      sessionStorage.setItem('rsbo_user', username);
      navigate('/app');
    }
  };

  return (
    <div className="login-page">
      {/* Left artistic panel */}
      <div className="login-page__left">
        <div className="login-page__bg-blob login-page__bg-blob--1" />
        <div className="login-page__bg-blob login-page__bg-blob--2" />
        <div className="login-page__bg-blob login-page__bg-blob--3" />

        <div className="login-page__branding">
          <div className="login-page__brand-logo">
            <IconMicroscope width={56} height={56} />
          </div>
          <h1 className="login-page__brand-title">Laboratorio<br />Eurovisión</h1>
          <p className="login-page__brand-subtitle">Sistema de Gestión Premium</p>

          <div className="login-page__floats">
            <div className="login-page__float login-page__float--1" />
            <div className="login-page__float login-page__float--2" />
            <div className="login-page__float login-page__float--3" />
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-page__right">
        <div className="login-page__form-wrap">
          <button className="login-page__back" onClick={() => navigate('/')}>
            <IconArrowLeft width={16} height={16} />
            Volver al inicio
          </button>

          <div className="login-card">
            <div className="login-card__header">
              <div className="login-card__logo">
                <IconMicroscope width={36} height={36} />
              </div>
              <h2 className="login-card__title">Laboratorio Eurovisión</h2>
              <p className="login-card__subtitle">Acceso al Portal Premium</p>
            </div>

            <form className="login-card__form" onSubmit={handleSubmit}>
              <div className="login-card__input-wrap">
                <span className="login-card__input-icon"><IconUser width={18} height={18} /></span>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-card__input"
                  autoComplete="username"
                />
              </div>

              <div className="login-card__input-wrap">
                <span className="login-card__input-icon"><IconLock width={18} height={18} /></span>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-card__input"
                  autoComplete="current-password"
                />
              </div>

              <div className="login-card__remember">
                <input
                  type="checkbox"
                  id="remember"
                  className="login-card__checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember" className="login-card__remember-label">Recordar usuario</label>
              </div>

              <button type="submit" className="login-card__submit">
                Iniciar Sesión →
              </button>
            </form>

            <div className="login-card__footer">
              ¿Olvidaste tu contraseña? <a href="#">Recuperar</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
