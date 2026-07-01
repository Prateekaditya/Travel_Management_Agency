const heroImage = '/user-signup-right-card-background-image.png';
const brandLogo = '/Logo.png';

function SignInHeroPanel() {
  return (
    <aside className="signin-card signin-visual-card" aria-label="Travel agency promo">
      <img className="signin-visual-image" src={heroImage} alt="Tropical beach travel destination" />
      <div className="signin-visual-overlay">
        <div className="signin-brand">
          <img className="signin-brand-logo" src={brandLogo} alt="Travel Agency" />
        </div>
        <h2 className="signin-visual-title">Let&apos;s plan your next trip!</h2>
      </div>
    </aside>
  );
}

export default SignInHeroPanel;
