export const HUB_PORTAL_STYLES = `
.hub-shell {
  display: grid;
  gap: 1.25rem;
}

.hub-header {
  border-bottom: 1px solid rgba(14, 165, 233, 0.18);
  background:
    linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(14px);
}

.hub-header__inner,
.hub-main {
  width: min(100%, 78rem);
  margin: 0 auto;
  padding-inline: 1.2rem;
}

.hub-header__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.hub-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #0f172a;
  text-decoration: none;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hub-logo__mark {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #0ea5e9, #14b8a6);
  color: white;
  font-size: 0.82rem;
}

.hub-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hub-nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 2.2rem;
  padding: 0 0.85rem;
  border-radius: 999px;
  text-decoration: none;
  color: rgba(15, 23, 42, 0.76);
  font-size: 0.92rem;
  font-weight: 600;
}

.hub-nav__link:hover {
  background: rgba(14, 165, 233, 0.08);
  color: #0f172a;
}

.hub-main {
  padding-top: 1.4rem;
  padding-bottom: 2rem;
}

.hub-hero {
  border: 1px solid rgba(14, 165, 233, 0.16);
  border-radius: 1.25rem;
  padding: 1.35rem;
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.22), transparent 36%),
    linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(240, 249, 255, 0.94));
  box-shadow: 0 24px 50px rgba(14, 116, 144, 0.08);
}

.hub-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
  font-weight: 700;
}

.hub-title {
  margin: 0;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.04;
  letter-spacing: -0.04em;
  color: #0f172a;
}

.hub-copy {
  margin: 0.7rem 0 0;
  max-width: 50rem;
  color: rgba(15, 23, 42, 0.72);
}

.hub-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.hub-chip {
  border-radius: 999px;
  padding: 0.38rem 0.72rem;
  background: rgba(14, 165, 233, 0.1);
  color: #0369a1;
  font-size: 0.78rem;
  font-weight: 700;
}

.hub-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 980px) {
  .hub-grid--two {
    grid-template-columns: 1.05fr 1fr;
    align-items: start;
  }
}

.hub-card {
  overflow: hidden;
  border: 1px solid rgba(14, 165, 233, 0.16);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 18px 40px rgba(14, 116, 144, 0.07);
}

.hub-card__header {
  padding: 1rem 1.05rem 0.55rem;
}

.hub-card__eyebrow {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.hub-card__title {
  margin: 0.2rem 0 0;
  font-size: 1.04rem;
  color: #0f172a;
}

.hub-card__description {
  margin: 0.35rem 0 0;
  color: rgba(15, 23, 42, 0.72);
  font-size: 0.92rem;
}

.hub-card__body {
  padding: 0.5rem 1.05rem 1.05rem;
}

.hub-footer {
  width: min(100%, 78rem);
  margin: 0 auto;
  padding: 0 1.2rem 2rem;
  color: rgba(15, 23, 42, 0.45);
  font-size: 0.78rem;
}

.hub-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.22rem 0.58rem;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
}

.hub-status--active {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.hub-status--inactive {
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
}

.hub-included--included {
  color: #047857;
  font-weight: 700;
}

.hub-included--pro {
  color: #b45309;
  font-weight: 700;
}

.hub-link {
  color: #0369a1;
  text-decoration: none;
  font-weight: 600;
}

.hub-link:hover {
  text-decoration: underline;
}
`;
