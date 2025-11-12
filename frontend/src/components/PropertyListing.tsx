import { useState, useEffect } from 'react';
// import PropertyCard from "./PropertyCard"

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: {
    address: string;
    city: string;
    country: string;
  };
  images: string[];
  rating: number;
  host: {
    name: string;
    email: string;
  };
}

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    description: string;
    price: number;
    location: {
      address: string;
      city: string;
      country: string;
    };
    images: string[];
    rating: number;
    host: {
      name: string;
      email: string;
    };
  };
}

export function PropertyListing() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/properties');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch properties');
        }

        setProperties(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted h-64 rounded-lg mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold">{property.title}</h3>
      <p className="text-gray-600">{property.description}</p>
      <p className="text-gray-600">{property.price} {property.location.address}</p>
      <img className="w-full h-48 object-cover rounded-lg" src={property.images[0]} alt={property.title} />
    </div>
  );
}