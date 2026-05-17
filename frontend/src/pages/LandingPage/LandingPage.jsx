import Navbar from './components/Navbar.jsx';
import HeroSection from './components/HeroSection.jsx';
import ProductsSection from './components/ProductsSection.jsx';
import ServicesSection from './components/ServicesSection.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import './LandingPage.css';

const LandingPage = () => (
  <div className="landing-page">
    <Navbar />
    <main>
      <HeroSection />
      <ProductsSection />
      <ServicesSection />
    </main>
    <SiteFooter />
  </div>
);

export default LandingPage;
