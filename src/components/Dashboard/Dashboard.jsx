import "./Dashboard.css";
import  { useState,useEffect } from "react";
import PropTypes from "prop-types";
import { FaDownload,FaEnvelope } from "react-icons/fa"; // Importa el icono de descarga

import BromleyLaptop from '../../assets/BromleyLaptop.png'
import BromleyMobile from '../../assets/BromleyMobile.png'
import LeyMarLaptop from '../../assets/LeyMarLaptop.png'
import LeyMarMobile from '../../assets/LeyMarMobile.png'
import SurfshowLaptop from '../../assets/SurfshowLaptop.png'
import SurfshowMobile from '../../assets/SurfshowMobile.png'
const portfolio = [
  {
    id: 1,
    proyecto: "E-commerce Platform for Bromley Ski Resort",
    cliente: "Dirigo Valley Systems",
    imagenes: [
      BromleyLaptop,
      BromleyMobile,
    ],
    techStack: [
      "C# .NET", "React", "JavaScript", "Handlebars", "SQL", "Azure", "MongoDB", "Heroku", "SendGrid", "WebSockets", "Socket.IO", "REST API", "Redis Cache", "OpenAI Models"
    ],
    descripcion: "Developed a robust e-commerce platform featuring secure payment gateways (Stripe, Google Pay, Apple Pay), real-time data validation, and seamless user experiences. Migrated the application from Heroku to Azure Cloud for enhanced performance and scalability.",
    link: "https://bromley.com",
  },
  {
    id: 2,
    proyecto: "Leidy Mar Apartments Booking",
    cliente: "Leidy Mar Apartments",
    imagenes:  [
      LeyMarLaptop,
      LeyMarMobile,
    ],
    techStack: ["Shopify", "Liquid", "Stripe", "PayPal"],
    descripcion: "Designed and configured an online store with reservation apps and payment solutions for streamlined user experience.",
    link: "https://leidymar-apartments.com",
  },
  {
    id: 3,
    proyecto: "Santa teresa Surf Show and Surfcam",
    cliente: "Santa Teresa Surf show",
    imagenes:  [
      SurfshowLaptop,
      SurfshowMobile,
    ],
    techStack: ["Shopify", "Liquid", "Stripe", "PayPal"],
    descripcion: "Designed and configured an online store with access to a Surfcam",
    link: "https://santateresasurfshow.com",
  },
  // Add more projects as needed
];

const ImageSlider = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images]);

  return (
    <div className="image-slider">
      <img src={images[currentIndex]} alt="Project screenshot" className="slider-image" />
    </div>
  );
};
ImageSlider.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
};
const Dashboard = () => {
  return (
      <div className="dashboard-container">
          <div className="dashboard-layout">
              {/* Main Content */}
              <main className="dashboard-content">
                  <div className="header-section">
                      <h2>Welcome to My Portfolio!</h2>
                      <a
                        href="/cv/Fullstack_Developer.docx" 
                        download="Joseph_Quesada_Fullstack_Developer.docx"  // Nombre del archivo que se descargará
                        className="download-cv-button"
                      >
                       <FaDownload /> Download Fullstack_Developer CV
                    </a>
<br></br>

                    <a
                        href="https://form.typeform.com/to/bragL3rq" 
                        className="download-cv-button"
                      >
                       <FaEnvelope /> Contact Me
                    </a>

                  </div>
                  <p>Explore my projects below:</p>
                  <div className="portfolio-grid">
                      {portfolio.map((project) => (
                          <div key={project.id} className="portfolio-card">
                              <h3>{project.proyecto}</h3>
                              <p><strong>Client:</strong> {project.cliente}</p>
                              <ImageSlider images={project.imagenes} />
                              <p><strong>Tech Stack:</strong> {project.techStack.join(", ")}</p>
                              <p>{project.descripcion}</p>
                              <a href={project.link} target="_blank" rel="noopener noreferrer" className="portfolio-link">
                                  Visit Project
                              </a>
                          </div>
                      ))}
                  </div>
                  <div data-tf-live="01JP58Y5XT31N5CN0WPZBK2S7W"></div><script src="//embed.typeform.com/next/embed.js"></script>
              </main>
          </div>
      </div>
  );
};

export default Dashboard;