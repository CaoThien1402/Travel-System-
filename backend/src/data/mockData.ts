export const users = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    password: "$2a$10$XGXgB.Uco3YAj8d8bCtAQ.yI5xKzXVNd9YI.Yw9Ku.VF2fdplQW4q" // "password123"
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    password: "$2a$10$XGXgB.Uco3YAj8d8bCtAQ.yI5xKzXVNd9YI.Yw9Ku.VF2fdplQW4q" // "password123"
  }
];

export const properties = [
  {
    id: "1",
    title: "Luxury Beach Villa",
    description: "Beautiful villa with ocean view",
    price: 299,
    location: {
      address: "123 Beach Road",
      city: "Miami",
      country: "USA",
      coordinates: {
        latitude: 25.7617,
        longitude: -80.1918
      }
    },
    amenities: ["Pool", "WiFi", "Kitchen", "Parking"],
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6"
    ],
    host: {
      id: "1",
      name: "John Doe",
      email: "john@example.com"
    },
    rating: 4.8,
    reviews: [
      {
        user: {
          id: "2",
          name: "Jane Smith"
        },
        rating: 5,
        comment: "Amazing place!",
        date: "2025-10-15T10:00:00Z"
      }
    ],
    created: "2025-10-01T08:00:00Z"
  },
  {
    id: "2",
    title: "Mountain Cabin",
    description: "Cozy cabin in the mountains",
    price: 199,
    location: {
      address: "456 Mountain View",
      city: "Denver",
      country: "USA",
      coordinates: {
        latitude: 39.7392,
        longitude: -104.9903
      }
    },
    amenities: ["Fireplace", "WiFi", "Kitchen", "Hiking Trails"],
    images: [
      "https://images.unsplash.com/photo-1542718610-a1d656d1884c",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7"
    ],
    host: {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com"
    },
    rating: 4.5,
    reviews: [],
    created: "2025-10-02T09:00:00Z"
  }
];