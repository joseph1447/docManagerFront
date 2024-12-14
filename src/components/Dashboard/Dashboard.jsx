import "./Dashboard.css";
import  { useState,useEffect } from "react";
import PropTypes from "prop-types";

import BromleyLaptop from '../../assets/BromleyLaptop.png'
import BromleyMobile from '../../assets/BromleyMobile.png'
import LeyMarLaptop from '../../assets/LeyMarLaptop.png'
import LeyMarMobile from '../../assets/LeyMarMobile.png'
const portfolio = [
  {
    id: 1,
    proyecto: "E-commerce Platform for Bromley Ski Resort",
    cliente: "Bromley Ski Resort",
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
    proyecto: "Portfolio Website",
    cliente: "Freelancer",
    imagenes: ["https://via.placeholder.com/300x200?text=Portfolio+Website"],
    techStack: ["HTML", "CSS", "JavaScript"],
    descripcion: "A clean and responsive portfolio website to showcase personal projects.",
    link: "https://freelancerportfolio.com",
  },
  {
    id: 3,
    proyecto: "Leidy Mar Apartments Online Store",
    cliente: "Leidy Mar Apartments",
    imagenes:  [
      LeyMarLaptop,
      LeyMarMobile,
    ],
    techStack: ["Shopify", "Liquid", "Stripe", "PayPal"],
    descripcion: "Designed and configured an online store with reservation apps and payment solutions for streamlined user experience.",
    link: "https://leidymar-apartments.com",
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
    <div className="dashboard-layout">
      {/* Main Content */}
      <main className="dashboard-content">
        <h2>Welcome to My Portfolio!</h2>
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
      </main>
    </div>
  );
};

export default Dashboard;