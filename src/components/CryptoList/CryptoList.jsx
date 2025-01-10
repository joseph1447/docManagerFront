import  { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types'; // Import PropTypes
const baseUrl = import.meta.env.VITE_API_URL;

const CryptoCard = ({ symbol, volatility, volume, currentPrice, imageUrl }) => (
  <div className="crypto-card">
    <img src={imageUrl} alt={`${symbol} logo`} />
    <div className="info">
      <p className="symbol">{symbol}</p>
      <p className="volatility">Volatility: {volatility.toFixed(2)}%</p>
      <p className="volume">Volume: ${volume.toLocaleString()}</p>
      <p className="price">Price: ${currentPrice.toFixed(2)}</p>
    </div>
  </div>
);
CryptoCard.propTypes = {
  symbol: PropTypes.string.isRequired,
  volatility: PropTypes.number.isRequired,
  volume: PropTypes.number.isRequired,
  currentPrice: PropTypes.number.isRequired,
  imageUrl: PropTypes.string.isRequired,
};

const CryptoList = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null); // Clear previous errors
      try {
        const apiURL =`${baseUrl}/api/top20-volatile`;
        const response = await axios.get(apiURL);
        setData(response.data);
      } catch (error) {
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <p>Loading data...</p>;
  }

  if (error) {
    return <p>Error fetching data: {error.message}</p>;
  }

  const sortedData = data.sort((a, b) => b.volatility - a.volatility);

  return (
    <div className="crypto-list">
      <h2>Top 20 Most Volatile Cryptocurrencies</h2>
      {sortedData.map((crypto) => (
        <CryptoCard key={crypto.symbol} {...crypto} />
      ))}
    </div>
  );
};

export default CryptoList;