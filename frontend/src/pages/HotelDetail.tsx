import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function HotelDetail() {
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchHotel() {
      try {
        const response = await fetch(`http://localhost:5000/api/properties/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch hotel details');
        }
        const data = await response.json();
        setHotel(data);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchHotel();
  }, [id]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!hotel) {
    return <div>Loading...</div>;
  }

  return (
    <div className="hotel-detail">
      <h1>{hotel.name}</h1>
      <p>Location: {hotel.location}</p>
      <p>Rating: {hotel.rating}</p>
      <p>Price: ${hotel.price}/night</p>
      <ul>
        {hotel.features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
    </div>
  );
}