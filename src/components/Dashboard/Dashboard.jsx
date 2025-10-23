import "./Dashboard.css";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FaDownload, FaEnvelope, FaLinkedin, FaGithub, FaCode, FaCloud, FaDatabase, FaMobile, FaGlobe, FaSun, FaMoon } from "react-icons/fa";

import BromleyLaptop from '../../assets/BromleyLaptop.png'
import BromleyMobile from '../../assets/BromleyMobile.png'
import LeyMarLaptop from '../../assets/LeyMarLaptop.png'
import LeyMarMobile from '../../assets/LeyMarMobile.png'
import SurfshowLaptop from '../../assets/SurfshowLaptop.png'
import SurfshowMobile from '../../assets/SurfshowMobile.png'
// Professional portfolio data
const portfolio = [
  {
    id: 1,
    title: "E-commerce Platform for Bromley Ski Resort",
    client: "Dirigo Valley Systems",
    images: [BromleyLaptop, BromleyMobile],
    techStack: ["C# .NET", "React", "JavaScript", "Azure", "MongoDB", "Stripe", "OpenAI"],
    description: "Developed a robust e-commerce platform featuring secure payment gateways, real-time data validation, and seamless user experiences. Migrated from Heroku to Azure Cloud for enhanced performance.",
    link: "https://bromley.com",
    category: "E-commerce"
  },
  {
    id: 2,
    title: "Leidy Mar Apartments Booking System",
    client: "Leidy Mar Apartments",
    images: [LeyMarLaptop, LeyMarMobile],
    techStack: ["Shopify", "Liquid", "Stripe", "PayPal"],
    description: "Designed and configured an online store with reservation apps and payment solutions for streamlined user experience.",
    link: "https://leidymar-apartments.com",
    category: "Booking Platform"
  },
  {
    id: 3,
    title: "Santa Teresa Surf Show & Surfcam",
    client: "Santa Teresa Surf Show",
    images: [SurfshowLaptop, SurfshowMobile],
    techStack: ["Shopify", "Liquid", "Stripe", "PayPal"],
    description: "Designed and configured an online store with access to a live surfcam for real-time surf conditions.",
    link: "https://santateresasurfcam.com",
    category: "E-commerce"
  }
];

const skills = [
  { category: "Backend", items: ["C# .NET", "Python", "Go", "Node.js", "PostgreSQL", "MongoDB", "SQL"] },
  { category: "Frontend", items: ["React", "Angular", "Vue", "NextJS", "SvelteKit", "TypeScript", "JavaScript"] },
  { category: "Cloud & DevOps", items: ["Azure", "Vercel", "Render.com", "Cloudflare", "Google Workspace"] },
  { category: "Tools & Platforms", items: ["Retool", "HubSpot", "n8n", "Gumloop", "Clay.com", "Stripe", "PayPal"] }
];

const experience = [
  {
    company: "MarketerHire",
    position: "Fullstack Developer",
    period: "SEPTEMBER 2025 — Present",
    location: "USA",
    description: "I manage end-to-end development operations for a talent marketplace platform that connects elite marketing professionals with leading companies.",
    achievements: [
      "Full-Stack development with SvelteKit, TypeScript, Node.js and PostgreSQL",
      "Rapid landing page delivery with optimized Figma-to-Cursor-to-Vercel pipeline",
      "Enterprise platform management and workflow automation",
      "Leadership of development teams"
    ]
  },
  {
    company: "Dirigo Valley Systems",
    position: "Senior Software Engineer",
    period: "MAY 2019 — Present",
    location: "USA",
    description: "I develop and maintain e-commerce applications, focusing on product variant selection and real-time data validation.",
    achievements: [
      "Contribution to e-commerce application development for Bromley Ski Resort",
      "On-premises infrastructure migration to Azure Cloud",
      "AI integration for data services with OpenAI",
      "Secure payment gateway integration (Stripe, Google Pay, Apple Pay)"
    ]
  }
];

const ImageSlider = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images && images.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="image-slider">
        <div className="no-image-placeholder">
          <FaCode className="placeholder-icon" />
          <span>Project Preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className="image-slider">
      <img 
        src={images[currentIndex]} 
        alt="Project screenshot" 
        className="slider-image"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      <div className="no-image-placeholder" style={{ display: 'none' }}>
        <FaCode className="placeholder-icon" />
        <span>Project Preview</span>
      </div>
    </div>
  );
};

ImageSlider.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'light' ? false : true; // Default to dark theme
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
      closeMobileMenu();
    }
  };

  return (
    <div className="portfolio-container">
      {/* Navigation */}
      <nav className="portfolio-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <span className="logo-text">Joseph Quesada</span>
            <span className="logo-subtitle">Fullstack Developer</span>
          </div>
          <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <button onClick={() => scrollToSection('hero')} className={activeSection === 'hero' ? 'active' : ''}>Home</button>
            <button onClick={() => scrollToSection('about')} className={activeSection === 'about' ? 'active' : ''}>About</button>
            <button onClick={() => scrollToSection('experience')} className={activeSection === 'experience' ? 'active' : ''}>Experience</button>
            <button onClick={() => scrollToSection('projects')} className={activeSection === 'projects' ? 'active' : ''}>Projects</button>
            <a href="/admin/xml-to-excel" className="nav-link" onClick={closeMobileMenu}>XML to Excel Tool</a>
            <button onClick={() => scrollToSection('contact')} className={activeSection === 'contact' ? 'active' : ''}>Contact</button>
          </div>
          <div className="nav-cta">
            <button onClick={toggleTheme} className="theme-toggle">
              {isDarkTheme ? <FaSun /> : <FaMoon />}
            </button>
            <a href="https://form.typeform.com/to/bragL3rq" className="cta-button">
              Free Consultation
            </a>
            <button className="hamburger-menu" onClick={toggleMobileMenu}>
              <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Quickly build your projects with the <span className="highlight">best developer.</span>
            </h1>
            <p className="hero-subtitle">
              Welcome to my portfolio, the faster, smarter, more profitable way to get your software projects done with AI and modern technologies.
            </p>
            <div className="hero-buttons">
              <a href="https://form.typeform.com/to/bragL3rq" className="btn-primary">
                Free Consultation
              </a>
              <a href="/cv/Fullstack_Developer.docx" download="Joseph_Quesada_Fullstack_Developer.docx" className="btn-secondary">
                <FaDownload /> Download CV
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-cards">
              <div className="floating-card card-1">
                <FaCode className="card-icon" />
                <span>Fullstack Development</span>
              </div>
              <div className="floating-card card-2">
                <FaCloud className="card-icon" />
                <span>Cloud Solutions</span>
              </div>
              <div className="floating-card card-3">
                <FaDatabase className="card-icon" />
                <span>Database Design</span>
              </div>
              <div className="floating-card card-4">
                <FaMobile className="card-icon" />
                <span>Mobile Apps</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-content">
          <h2 className="section-title">About Me</h2>
          <div className="about-grid">
            <div className="about-text">
              <p className="about-description">
                Fullstack Developer with over 9 years of experience and solid background in .NET, JavaScript/TypeScript and modern cloud infrastructure. Expert in building scalable web applications, enterprise workflow management and third-party platform integration.
              </p>
              <div className="contact-info">
                <div className="contact-item">
                  <FaEnvelope />
                  <span>josephquesada92@gmail.com</span>
                </div>
                <div className="contact-item">
                  <FaGlobe />
                  <span>Costa Rica</span>
                </div>
                <div className="contact-item">
                  <span>Phone: +506 83161976</span>
                </div>
              </div>
            </div>
            <div className="skills-grid">
              {skills.map((skillGroup, index) => (
                <div key={index} className="skill-category">
                  <h4>{skillGroup.category}</h4>
                  <div className="skill-tags">
                    {skillGroup.items.map((skill, skillIndex) => (
                      <span key={skillIndex} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="experience-section">
        <div className="section-content">
          <h2 className="section-title">Professional Experience</h2>
          <div className="experience-timeline">
            {experience.map((exp, index) => (
              <div key={index} className="experience-item">
                <div className="experience-header">
                  <h3>{exp.position}</h3>
                  <div className="experience-meta">
                    <span className="company">{exp.company}</span>
                    <span className="period">{exp.period}</span>
                    <span className="location">{exp.location}</span>
                  </div>
                </div>
                <p className="experience-description">{exp.description}</p>
                <ul className="achievements-list">
                  {exp.achievements.map((achievement, achIndex) => (
                    <li key={achIndex}>{achievement}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="projects-section">
        <div className="section-content">
          <h2 className="section-title">Featured Projects & Tools</h2>
          <div className="projects-grid">
            {portfolio.map((project) => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <h3>{project.title}</h3>
                  <span className="project-category">{project.category}</span>
                </div>
                <ImageSlider images={project.images} />
                <div className="project-content">
                  <p className="project-client"><strong>Client:</strong> {project.client}</p>
                  <p className="project-description">{project.description}</p>
                  <div className="project-tech">
                    {project.techStack.map((tech, techIndex) => (
                      <span key={techIndex} className="tech-tag">{tech}</span>
                    ))}
                  </div>
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="project-link">
                    View Project
                  </a>
                </div>
              </div>
            ))}
            
            {/* XML to Excel Tool Card */}
            <div className="project-card tool-card">
              <div className="project-header">
                <h3>XML to Excel Converter</h3>
                <span className="project-category">Utility Tool</span>
              </div>
              <div className="tool-preview">
                <div className="tool-icon">
                  <FaCode />
                </div>
                <h4>Professional Data Conversion</h4>
                <p>Convert XML files to Excel format with advanced processing capabilities</p>
              </div>
              <div className="project-content">
                <p className="project-description">
                  A powerful web-based tool that converts XML files to Excel format with support for multiple files, 
                  data validation, and seamless download functionality. Built with React and modern web technologies.
                </p>
                <div className="project-tech">
                  <span className="tech-tag">React</span>
                  <span className="tech-tag">JavaScript</span>
                  <span className="tech-tag">Node.js</span>
                  <span className="tech-tag">File Processing</span>
                </div>
                <a href="/admin/xml-to-excel" className="project-link">
                  Use Tool
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="section-content">
          <h2 className="section-title">Let's Work Together</h2>
          <div className="contact-grid">
            <div className="contact-info-section">
              <h3>Get in Touch</h3>
              <p>Ready to start your next project? Let's discuss how I can help you achieve your goals with modern technology and AI solutions.</p>
              <div className="contact-methods">
                <a href="mailto:josephquesada92@gmail.com" className="contact-method">
                  <FaEnvelope />
                  <span>josephquesada92@gmail.com</span>
                </a>
                <a href="tel:+50683161976" className="contact-method">
                  <span>+506 83161976</span>
                </a>
                <a href="https://form.typeform.com/to/bragL3rq" className="contact-method">
                  <span>Schedule a Call</span>
                </a>
              </div>
            </div>
            <div className="contact-form-section">
              <div className="typeform-container">
                <div data-tf-live="01JP58Y5XT31N5CN0WPZBK2S7W"></div>
                <script src="//embed.typeform.com/next/embed.js"></script>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="portfolio-footer">
        <div className="footer-content">
          <div className="footer-info">
            <h4>Joseph Quesada Barrantes</h4>
            <p>Fullstack Developer & Software Consultant</p>
            <p>Specializing in AI, Modern Web Technologies, and Cloud Solutions</p>
          </div>
          <div className="footer-links">
            <a href="/cv/Fullstack_Developer.docx" download>
              <FaDownload /> Download CV
            </a>
            <a href="https://form.typeform.com/to/bragL3rq">
              <FaEnvelope /> Contact Me
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Joseph Quesada. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;