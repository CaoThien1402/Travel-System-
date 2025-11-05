interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Location {
  address: string;
  city: string;
  country: string;
  coordinates: Coordinates;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Review {
  user: { id: string; name: string };
  rating: number;
  comment: string;
  date: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: Location;
  amenities: string[];
  images: string[];
  host: User;
  created: string;
  reviews: Review[];
  rating: number;
}